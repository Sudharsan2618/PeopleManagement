import smtplib
from email.message import EmailMessage
from typing import Optional, List, Tuple


def send_email(
    smtp_host: str,
    smtp_port: int,
    smtp_user: Optional[str],
    smtp_password: Optional[str],
    use_tls: bool,
    use_ssl: bool,
    from_address: str,
    to_address: str,
    subject: str,
    body: str,
    attachment_name: str,
    attachment_bytes: bytes,
    attachment_mime_type: str,
) -> None:
    """Send an email with a single attachment using SMTP."""
    msg = EmailMessage()
    msg["From"] = from_address
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)
    maintype, subtype = attachment_mime_type.split("/", 1)
    msg.add_attachment(attachment_bytes, maintype=maintype, subtype=subtype, filename=attachment_name)

    if use_ssl:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)

    try:
        server.ehlo()
        if use_tls and not use_ssl:
            server.starttls()
            server.ehlo()
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(msg)
    finally:
        server.quit()


def send_email_multiple(
    smtp_host: str,
    smtp_port: int,
    smtp_user: Optional[str],
    smtp_password: Optional[str],
    use_tls: bool,
    use_ssl: bool,
    from_address: str,
    to_address: str,
    subject: str,
    body: str,
    attachments: List[Tuple[str, bytes, str]],  # List of (filename, content_bytes, mime_type)
) -> None:
    """Send an email with multiple attachments using SMTP."""
    msg = EmailMessage()
    msg["From"] = from_address
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.set_content(body)

    for filename, attachment_bytes, mime_type in attachments:
        if "/" in mime_type:
            maintype, subtype = mime_type.split("/", 1)
        else:
            maintype, subtype = "application", mime_type
        msg.add_attachment(attachment_bytes, maintype=maintype, subtype=subtype, filename=filename)

    if use_ssl:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)

    try:
        server.ehlo()
        if use_tls and not use_ssl:
            server.starttls()
            server.ehlo()
        if smtp_user and smtp_password:
            server.login(smtp_user, smtp_password)
        server.send_message(msg)
    finally:
        server.quit()

