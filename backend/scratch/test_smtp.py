"""
Quick test: verify Gmail SMTP settings from .env can send a test email.
Run from the backend/ directory:  python test_smtp.py
"""
import sys
import os

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

smtp_host     = os.environ.get("SMTP_HOST", "smtp.gmail.com")
smtp_port     = int(os.environ.get("SMTP_PORT", "587"))
smtp_user     = os.environ.get("SMTP_USER", "")
smtp_password = os.environ.get("SMTP_PASSWORD", "")
smtp_from     = os.environ.get("SMTP_FROM", smtp_user)
use_tls       = os.environ.get("SMTP_USE_TLS", "True").lower() == "true"
use_ssl       = os.environ.get("SMTP_USE_SSL", "False").lower() == "true"

recipient = "thirshi7817@gmail.com"

print(f"SMTP Host     : {smtp_host}")
print(f"SMTP Port     : {smtp_port}")
print(f"SMTP User     : {smtp_user}")
print(f"SMTP Password : {'*' * len(smtp_password) if smtp_password else '(empty!)'}")
print(f"From          : {smtp_from}")
print(f"Use TLS       : {use_tls}")
print(f"Use SSL       : {use_ssl}")
print(f"Sending test mail to: {recipient}")
print()

if not smtp_host or not smtp_from or not smtp_password:
    print("ERROR: SMTP settings are missing. Check your .env file.")
    sys.exit(1)

import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg["From"]    = smtp_from
msg["To"]      = recipient
msg["Subject"] = "TATTI CRM - SMTP Test Email"
msg.set_content(
    "This is a test email from the TATTI CRM backend.\n"
    "If you received this, the Gmail SMTP configuration is working correctly!\n\n"
    "-- TATTI CRM System"
)

try:
    if use_ssl:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)

    server.ehlo()
    if use_tls and not use_ssl:
        server.starttls()
        server.ehlo()
    if smtp_user and smtp_password:
        server.login(smtp_user, smtp_password)
    server.send_message(msg)
    server.quit()

    print("SUCCESS -- Test email sent! Check thirshi7817@gmail.com inbox.")

except smtplib.SMTPAuthenticationError as e:
    print(f"AUTH ERROR -- App password may be wrong or 2FA not enabled: {e}")
    sys.exit(1)
except Exception as e:
    print(f"FAILED -- {type(e).__name__}: {e}")
    sys.exit(1)
