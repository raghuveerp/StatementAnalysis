from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Transaction:
    date: str          # ISO format: YYYY-MM-DD
    description: str
    amount: float      # positive = debit/expense, negative = credit/payment
    category: str
    bank: str

    def to_dict(self) -> dict:
        return asdict(self)
