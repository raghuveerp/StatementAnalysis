import re
import pdfplumber
from categorizer import categorize
from models.transaction import Transaction
from parsers.base import BaseParser


# Amex statements have lines like:
#   12/22/24* MOBILE PAYMENT - THANK YOU             -$30.14
#   12/23/24  razorpay*Indigo Gurgaon IN 53,841.00   $633.98⧫
#   12/19/24  razorpay*Indigo 22,728.00              -$267.98⧫
# Date: MM/DD/YY or MM/DD/YYYY, optionally followed by * (posting date indicator)
# Amount: always has a $ prefix; negative = payment/credit; ⧫ = Pay Over Time marker
# Foreign transactions include a foreign-currency amount before the USD amount —
# the non-greedy description group absorbs it naturally.
_TX_PATTERN = re.compile(
    r"(\d{2}/\d{2}/\d{2,4})\*?\s+(.+?)\s+([-]?\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[⧫]?\s*$"
)


class AmexParser(BaseParser):
    def can_parse(self, text: str) -> bool:
        t = text.lower()
        return "american express" in t or "amex" in t

    def parse(self, pdf_path: str) -> list[Transaction]:
        transactions: list[Transaction] = []

        with pdfplumber.open(pdf_path) as pdf:
            full_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )

        # Extract statement year (e.g. from "Closing Date01/17/25")
        year_match = re.search(r"\b(20\d{2})\b", full_text)
        year = year_match.group(1) if year_match else "2024"

        for line in full_text.splitlines():
            m = _TX_PATTERN.match(line.strip())
            if not m:
                continue
            date_str, desc, amount_str = m.groups()

            # Strip dollar sign; sign is already correct (- for credits/payments)
            amount = float(amount_str.replace("$", "").replace(",", ""))

            # Normalize date to ISO format
            parts = date_str.split("/")
            month, day, yr = parts[0], parts[1], parts[2]
            if len(yr) == 2:
                yr = "20" + yr
            iso_date = f"{yr}-{month}-{day}"

            transactions.append(Transaction(
                date=iso_date,
                description=desc.strip(),
                amount=amount,
                category=categorize(desc),
                bank="American Express",
            ))

        return transactions
