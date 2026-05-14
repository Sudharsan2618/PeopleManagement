import re

def clean_phone_number(phone: str) -> str:
    """
    Cleans a phone number string and returns exactly the last 10 digits.
    Example: '+91 98765-43210' -> '9876543210'
    """
    if not phone:
        return ""
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(phone))
    
    # Take the last 10 digits
    if len(digits) >= 10:
        return digits[-10:]
    
    return digits

def format_for_meta(phone: str) -> str:
    """
    Ensures the number is 10 digits and prepends '91' for Meta API.
    """
    clean = clean_phone_number(phone)
    if len(clean) == 10:
        return f"91{clean}"
    return clean # Fallback for invalid numbers
