import re
from typing import Optional, Tuple

# Text placeholders that mean "no number" rather than a real value.
_PHONE_PLACEHOLDERS = {"", "na", "n/a", "n.a", "nil", "null", "none", "-", "--", ".", "0"}


def clean_phone_number(phone: str) -> str:
    """
    Cleans a phone number string and returns exactly the last 10 digits.
    Example: '+91 98765-43210' -> '9876543210'

    NOTE: This is a lenient cleaner kept for backwards compatibility. It does not
    validate that the result is a real Indian mobile. For import/validation use
    ``normalize_indian_mobile`` instead.
    """
    if not phone:
        return ""

    # Remove all non-digit characters
    digits = re.sub(r'\D', '', str(phone))

    # Take the last 10 digits
    if len(digits) >= 10:
        return digits[-10:]

    return digits


def _expand_scientific(raw: str) -> str:
    """Best-effort expansion of a phone stored as scientific notation text.

    Excel/CSV sometimes serialises long numbers as '9.87654e+9' or '9.87654321E+09'.
    ``int(float(...))`` recovers the intended integer when it parses cleanly.
    """
    try:
        as_float = float(raw)
    except (TypeError, ValueError):
        return raw
    # Only expand values that were actually written in exponent form; leaving
    # ordinary numeric strings untouched avoids float precision surprises.
    if "e" in raw.lower():
        return str(int(as_float))
    return raw


def normalize_indian_mobile(raw) -> Tuple[Optional[str], bool, Optional[str]]:
    """Normalize an arbitrary phone cell to a valid 10-digit Indian mobile.

    Handles: +91 / 91 / 0091 / leading 0 prefixes, spaces/dashes/parens/dots,
    Excel numeric & scientific-notation cells, multiple numbers in one cell
    (first valid wins), and placeholder junk ('NA', '-', 'null').

    Returns ``(value, valid, reason)``:
      - value: clean 10-digit string if valid, else None
      - valid: True only for a real Indian mobile (10 digits, first digit 6-9)
      - reason: human-readable explanation when not valid (None when valid)
    """
    if raw is None:
        return None, False, None

    # Excel numeric cell -> render without trailing '.0' or exponent.
    if isinstance(raw, float):
        if raw != raw:  # NaN
            return None, False, None
        raw = str(int(raw)) if raw.is_integer() else repr(raw)
    elif isinstance(raw, int):
        raw = str(raw)
    else:
        raw = str(raw).strip()

    if raw.lower() in _PHONE_PLACEHOLDERS:
        return None, False, None

    raw = _expand_scientific(raw)

    # A cell may hold several numbers ("98... / 91...", "98..., 98...", "98 or 98").
    # Split only on genuine multi-number separators so a single number containing
    # internal spaces/dashes ("+91 98765-43210") stays intact.
    candidates = [c for c in re.split(r'[\/,;|&\n]+|\s+or\s+', raw, flags=re.IGNORECASE) if c.strip()]
    if not candidates:
        return None, False, "No digits found"

    first_reason = None
    for candidate in candidates:
        value, valid, reason = _normalize_single(candidate)
        if valid:
            return value, True, None
        if first_reason is None:
            first_reason = reason

    return None, False, first_reason or "Invalid phone number"


def _normalize_single(candidate: str) -> Tuple[Optional[str], bool, Optional[str]]:
    digits = re.sub(r'\D', '', candidate)

    if not digits:
        return None, False, "No digits found"

    # Strip common country-code / trunk prefixes down to the core subscriber number.
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 13 and digits.startswith("091"):
        digits = digits[3:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]
    elif len(digits) > 10:
        # Fallback: keep the last 10 (handles odd prefixes) but still validate below.
        digits = digits[-10:]

    if len(digits) < 10:
        return None, False, f"Too short ({len(digits)} digits)"
    if len(digits) > 10:
        return None, False, "Too long for an Indian mobile"
    if digits[0] not in "6789":
        return None, False, "Not a mobile number (must start 6-9)"

    return digits, True, None


def format_for_meta(phone: str) -> str:
    """
    Ensures the number is 10 digits and prepends '91' for Meta API.
    """
    clean = clean_phone_number(phone)
    if len(clean) == 10:
        return f"91{clean}"
    return clean  # Fallback for invalid numbers
