import pdfplumber
from parsers.base import BaseParser
from parsers.chase import ChaseParser
from parsers.amex import AmexParser
from parsers.generic import GenericParser


_PARSERS: list[BaseParser] = [
    ChaseParser(),
    AmexParser(),
    # Add more bank-specific parsers here before GenericParser
    GenericParser(),  # must be last — always matches
]


def get_parser(pdf_path: str) -> BaseParser:
    """Return the first parser that recognises the PDF content."""
    with pdfplumber.open(pdf_path) as pdf:
        first_page_text = pdf.pages[0].extract_text() or "" if pdf.pages else ""

    for parser in _PARSERS:
        if parser.can_parse(first_page_text):
            return parser

    return GenericParser()
