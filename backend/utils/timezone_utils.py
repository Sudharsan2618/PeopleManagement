from datetime import datetime
from zoneinfo import ZoneInfo

def get_ist_now():
    """Returns the current time in India Standard Time (IST)."""
    return datetime.now(ZoneInfo("Asia/Kolkata"))

def format_ist_now():
    """Returns the current IST time as a formatted string."""
    return get_ist_now().strftime("%Y-%m-%d %H:%M:%S")
