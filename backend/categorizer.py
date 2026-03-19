import os
import yaml
from models.transaction import Transaction


_rules: dict[str, list[str]] = {}


def _load_rules() -> dict[str, list[str]]:
    global _rules
    if _rules:
        return _rules
    yml_path = os.path.join(os.path.dirname(__file__), "categories.yml")
    with open(yml_path) as f:
        data = yaml.safe_load(f)
    _rules = {cat: [kw.lower() for kw in keywords]
              for cat, keywords in data["categories"].items()}
    return _rules


def categorize(description: str) -> str:
    rules = _load_rules()
    desc_lower = description.lower()
    for category, keywords in rules.items():
        for kw in keywords:
            if kw in desc_lower:
                return category
    return "Other"
