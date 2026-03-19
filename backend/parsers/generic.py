"""
Generic fallback parser.

Tries to find lines with a date pattern, a description, and a dollar amount.
Handles a wide range of statement formats as a best-effort approach.
"""
import re
import pdfplumber
from categorizer import categorize
from models.transaction import Transaction
from parsers.base import BaseParser


# Matches lines like:
#   01/15/2024   Some Description      $1,234.56
#   2024-01-15   Some Description      1234.56
#   Jan 15, 2024 Some Description      1,234.56
_DATE_PATTERNS = [
    r"(\d{2}/\d{2}/\d{4})",   # MM/DD/YYYY
    r"(\d{4}-\d{2}-\d{2})",   # YYYY-MM-DD
    r"(\d{2}/\d{2}/\d{2})",   # MM/DD/YY
    r"(\d{2}-\d{2}-\d{4})",   # MM-DD-YYYY
    r"([A-Z][a-z]{2}\s+\d{1,2},?\s+\d{4})",  # Jan 15, 2024
    r"(\d{2}/\d{2})",          # MM/DD (no year)
]

_AMOUNT_PATTERN = r"\$?\s*([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2}))\s*(CR|DR)?\s*$"

_COMBINED = re.compile(
    r"^(" + "|".join(_DATE_PATTERNS) + r")\s+(.+?)\s+" + _AMOUNT_PATTERN,
    re.IGNORECASE,
)

_MONTH_MAP = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "may": "05", "jun": "06", "jul": "07", "aug": "08",
    "sep": "09", "oct": "10", "nov": "11", "dec": "12",
}


def _normalize_date(raw: str) -> str:
    raw = raw.strip().rstrip(",")

    # YYYY-MM-DD
    if re.match(r"\d{4}-\d{2}-\d{2}", raw):
        return raw

    # MM/DD/YYYY or MM-DD-YYYY
    m = re.match(r"(\d{2})[/-](\d{2})[/-](\d{4})", raw)
    if m:
        return f"{m.group(3)}-{m.group(1)}-{m.group(2)}"

    # MM/DD/YY
    m = re.match(r"(\d{2})/(\d{2})/(\d{2})", raw)
    if m:
        year = "20" + m.group(3)
        return f"{year}-{m.group(1)}-{m.group(2)}"

    # MM/DD (no year — use current year as placeholder)
    m = re.match(r"(\d{2})/(\d{2})$", raw)
    if m:
        return f"2024-{m.group(1)}-{m.group(2)}"

    # Jan 15 2024
    m = re.match(r"([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})", raw)
    if m:
        month = _MONTH_MAP.get(m.group(1).lower(), "01")
        day = m.group(2).zfill(2)
        return f"{m.group(3)}-{month}-{day}"

    return raw


class GenericParser(BaseParser):
    def can_parse(self, text: str) -> bool:
        # Always returns True — this is the fallback
        return True

    def parse(self, pdf_path: str) -> list[Transaction]:
        transactions: list[Transaction] = []

        with pdfplumber.open(pdf_path) as pdf:
            full_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )

        # Detect bank name from first page
        first_page_text = full_text[:500].lower()
        bank = "Unknown"
        for name in ["chase", "bank of america", "wells fargo", "citi", "capital one",
                     "discover", "amex", "american express", "barclays", "us bank"]:
            if name in first_page_text:
                bank = name.title()
                break

        for line in full_text.splitlines():
            m = _COMBINED.match(line.strip())
            if not m:
                continue
            # Groups: full_date_match, ...individual date groups..., description, amount, CR/DR
            groups = m.groups()
            raw_date = groups[0]
            desc = groups[-3]
            amount_str = groups[-2]
            cr_dr = (groups[-1] or "").upper()

            try:
                amount = float(amount_str.replace(",", ""))
            except ValueError:
                continue

            # CR suffix means credit/refund — negate if not already negative
            if cr_dr == "CR" and amount > 0:
                amount = -amount

            transactions.append(Transaction(
                date=_normalize_date(raw_date),
                description=desc.strip(),
                amount=amount,
                category=categorize(desc),
                bank=bank,
            ))

        return transactions
