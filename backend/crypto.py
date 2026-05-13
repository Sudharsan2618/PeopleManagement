"""
crypto.py — RSA + AES-GCM helpers for WhatsApp Flow encryption.
Private key is loaded ONCE at module import (not per-request).
"""

import base64
import json
from functools import lru_cache

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric.padding import MGF1, OAEP
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.hashes import SHA256
from cryptography.hazmat.primitives.serialization import load_pem_private_key


@lru_cache(maxsize=1)
def _private_key():
    """Load and cache the RSA private key — disk read happens exactly once."""
    with open("private_rsa.pem", "rb") as f:
        return load_pem_private_key(f.read(), password=None, backend=default_backend())


def _decrypt_aes_key(encrypted_aes_key_b64: str) -> bytes:
    return _private_key().decrypt(
        base64.b64decode(encrypted_aes_key_b64),
        OAEP(mgf=MGF1(algorithm=SHA256()), algorithm=SHA256(), label=None),
    )


def decrypt_flow_request(
    encrypted_flow_data: str,
    encrypted_aes_key: str,
    initial_vector: str,
) -> dict:
    aes_key        = _decrypt_aes_key(encrypted_aes_key)
    iv             = base64.b64decode(initial_vector)
    raw            = base64.b64decode(encrypted_flow_data)
    encrypted_body = raw[:-16]
    auth_tag       = raw[-16:]

    decryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(iv, auth_tag),
        backend=default_backend(),
    ).decryptor()

    plaintext = decryptor.update(encrypted_body) + decryptor.finalize()
    return json.loads(plaintext.decode("utf-8"))


def encrypt_flow_response(
    response_body: dict,
    encrypted_aes_key: str,
    initial_vector: str,
) -> str:
    aes_key    = _decrypt_aes_key(encrypted_aes_key)
    iv         = base64.b64decode(initial_vector)
    flipped_iv = bytes(b ^ 0xFF for b in iv)

    encryptor = Cipher(
        algorithms.AES(aes_key),
        modes.GCM(flipped_iv),
        backend=default_backend(),
    ).encryptor()

    body_bytes = json.dumps(response_body).encode("utf-8")
    ciphertext = encryptor.update(body_bytes) + encryptor.finalize()
    return base64.b64encode(ciphertext + encryptor.tag).decode("utf-8")