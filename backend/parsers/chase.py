import re
import pdfplumber
from categorizer import categorize
from models.transaction import Transaction
from parsers.base import BaseParser


# Chase statements have lines like:
#   01/15    STARBUCKS #1234 SEATTLE WA     5.75
#   01/16    AMAZON.COM*AB1CD2EF3  SEATTLE  42.99
_TX_PATTERN = re.compile(
    r"(\d{2}/\d{2})\s+(.+?)\s+([-]?\d{1,3}(?:,\d{3})*(?:\.\d{2}))\s*$"
)


class ChaseParser(BaseParser):
    def can_parse(self, text: str) -> bool:
        return "chase" in text.lower() or "jpmorgan" in text.lower()

    def parse(self, pdf_path: str) -> list[Transaction]:
        transactions: list[Transaction] = []
        year = None

        with pdfplumber.open(pdf_path) as pdf:
            full_text = "\n".join(
                page.extract_text() or "" for page in pdf.pages
            )

        # Try to extract statement year from text
        year_match = re.search(r"\b(20\d{2})\b", full_text)
        year = year_match.group(1) if year_match else "2024"

        for line in full_text.splitlines():
            m = _TX_PATTERN.match(line.strip())
            if not m:
                continue
            date_str, desc, amount_str = m.groups()
            amount = float(amount_str.replace(",", ""))
            month, day = date_str.split("/")
            iso_date = f"{year}-{month}-{day}"
            transactions.append(Transaction(
                date=iso_date,
                description=desc.strip(),
                amount=amount,
                category=categorize(desc),
                bank="Chase",
            ))

        return transactions
