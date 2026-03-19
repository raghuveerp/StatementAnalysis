from abc import ABC, abstractmethod
from models.transaction import Transaction


class BaseParser(ABC):
    @abstractmethod
    def can_parse(self, text: str) -> bool:
        """Return True if this parser recognises the PDF content."""

    @abstractmethod
    def parse(self, pdf_path: str) -> list[Transaction]:
        """Extract and return a list of transactions from the PDF."""
