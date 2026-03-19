# Application Build Prompt

Build a full-stack web application to analyze credit card and bank PDF statements.

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, pdfplumber, PyYAML, python-multipart
- **Frontend**: React 18, TypeScript, Vite, Recharts

---

## Core Features

### PDF Upload & Parsing
- Browser UI with drag-and-drop or file picker to upload **multiple PDF statements at once**
- Transactions are **merged across all uploaded files** — you can keep adding statements and they accumulate
- A "Clear all" button resets everything
- Uploaded filenames are shown as green pills after loading
- Support dedicated parsers for **Chase**, **American Express**, and a **generic fallback** for all other banks (Wells Fargo, BofA, Capital One, Citi, Discover, etc.)
- Each bank parser implements a `can_parse(text)` method and a `parse(pdf_path)` method via a shared `BaseParser` abstract class
- A registry auto-detects the bank from the first page of the PDF and routes to the correct parser
- Partial failures (one PDF fails, others succeed) show per-file error messages without losing already-loaded data

### Transaction Data Model
Each transaction has: `date` (ISO YYYY-MM-DD), `description`, `amount` (positive = expense, negative = refund/credit), `category`, `bank`

### Categorization
- Rule-based keyword matching defined in `categories.yml` — user-editable, no ML
- Categories are checked in order; first match wins
- Categories include:
  - **Food & Dining**: restaurant, cafe, Starbucks, DoorDash, UberEats, Chipotle, etc.
  - **Michelin**: Noma, Singlethread, Chez TJ
  - **Insurance**: Farmers
  - **Groceries**: Whole Foods, Trader Joe's, Kroger, Costco, etc.
  - **Transport**: Uber, Lyft, parking, gas stations (Shell, Exxon, Chevron), etc.
  - **Shopping**: Amazon, eBay, Nordstrom, Nike, Best Buy, etc.
  - **Entertainment**: Netflix, Spotify, Hulu, Disney+, Ticketmaster, Steam, etc.
  - **Wine**: wine, cellar, winery, vineyard, "napa ca", "napa, ca", St Helena — checked **before** Travel
  - **Travel**: airline, airways, Delta, United, Southwest, JetBlue, **Emirates, Qatar, Air India**, hotel, Marriott, Hilton, Airbnb, Expedia, etc.
  - **Health & Fitness**: pharmacy, CVS, Walgreens, doctor, gym, Equinox, etc.
  - **Utilities**: electric, water, internet, Comcast, AT&T, Verizon, T-Mobile, etc.
  - **Subscriptions**: subscription, Adobe, Microsoft, Google, iCloud, Dropbox, etc.
  - **Finance**: payment, transfer, autopay, insurance, mortgage, rent, loan, fee, etc.
  - **Education**: tuition, university, Udemy, Coursera, LinkedIn Learning, textbook, etc.
  - **Other**: anything unmatched

### Refund Handling
- Negative amounts (credits, refunds) are **included** in the transaction list — not filtered out
- In the transaction table, refunds display as `-$42.00` in **green**
- Generic parser handles `CR`-suffixed amounts (e.g. `42.00 CR`) by negating them
- When a **min-amount filter** is active, any refund from the same merchant as a passing positive transaction is **automatically included** even if its absolute value is below the threshold (merchant matched by first word of description)

---

## UI Features

### Filter Bar
- **Category chips** — toggle individual categories on/off; "All" and "None" buttons for bulk selection
- **Min amount input** — numeric field; shows only transactions ≥ that amount (plus matched refunds from those merchants)

### Summary Panel
- Shows total transaction count and total spend for the current filtered view
- Per-category breakdown with dollar total and % of spend

### View Toggle: Table vs Charts
Two views switchable via "Table" / "Charts" toggle buttons:

#### Table View
- Sortable columns: Date, Description, Category, Amount
- Click any column header to sort; click again to reverse
- Negative amounts shown in green as `-$XX.XX`

#### Charts View (using Recharts)
- **Spending by Category** — pie/donut chart with percentage labels
- **Monthly Spending vs Refunds** — grouped bar chart; spending in indigo, refunds in green
- **Top 10 Merchants by Spend** — horizontal bar chart sorted by total spend

---

## Project Structure

```
backend/
├── main.py                  # FastAPI app — POST /upload (multi-file), GET /health
├── parsers/
│   ├── base.py              # Abstract BaseParser
│   ├── registry.py          # Bank auto-detection, ordered parser list
│   ├── chase.py             # Chase-specific parser
│   ├── amex.py              # American Express parser
│   └── generic.py           # Fallback parser for all other banks
├── models/transaction.py    # Transaction dataclass
├── categorizer.py           # Keyword matching against categories.yml
├── categories.yml           # Editable category rules
└── requirements.txt

frontend/src/
├── App.tsx                  # State, filtering logic, view toggle
├── api.ts                   # uploadStatements(files[]) fetch call
└── components/
    ├── UploadZone.tsx        # Drag-and-drop multi-file upload
    ├── FilterBar.tsx         # Category chips + min-amount input
    ├── SummaryPanel.tsx      # Totals by category for current filter
    ├── TransactionTable.tsx  # Sortable table, green refund amounts
    └── ChartsView.tsx        # Pie + monthly bar + top merchants bar
```

## Running Locally
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --reload       # http://localhost:8000

# Frontend
cd frontend && npm install
npm run dev                     # http://localhost:5173
```

---

## Bug Fixes & Iterative Improvements

### Fix: American Express parser not parsing transactions

**Problem:** Amex statements were not being parsed correctly — no transactions were extracted despite the parser being selected.

**Root cause:** The original `amex.py` regex was written for a hypothetical Amex format (bare amounts like `42.99`) but real Amex PDF statements (as extracted by pdfplumber) have a completely different line format:
- Amounts are always `$`-prefixed: `$633.98`, `-$267.98`
- Posting dates have a `*` suffix: `12/22/24*`
- Foreign transactions include a foreign-currency amount before the USD amount: `53,841.00 $633.98⧫`
- Pay Over Time transactions end with `⧫`

**Fix applied to `backend/parsers/amex.py`:**
- Rewrote `_TX_PATTERN` regex to match the actual format:
  ```
  (\d{2}/\d{2}/\d{2,4})\*?\s+(.+?)\s+([-]?\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?)[⧫]?\s*$
  ```
  - `\*?` — handles optional posting-date asterisk
  - `[-]?\$` — matches optional leading minus and required dollar sign
  - `[⧫]?` — ignores Pay Over Time marker at end of line
  - Non-greedy `(.+?)` description absorbs foreign currency amounts naturally
- Updated amount parsing to strip `$` before calling `float()`
- Made decimal part optional (`(?:\.\d{2})?`) for robustness

**Diagnostic command used to inspect raw PDF text:**
```bash
cd backend && python -c "
import pdfplumber
with pdfplumber.open('your_amex.pdf') as pdf:
    for i, page in enumerate(pdf.pages[1:4], 2):
        text = page.extract_text() or ''
        print(f'=== PAGE {i} ===')
        for line in text.splitlines():
            if line.strip():
                print(repr(line))
        print()
"
```

---

### Feature: Category filter chips with smart toggle and transaction counts

**Request:** Make categories filterable so only selected category transactions are shown.

**Changes made:**

**`frontend/src/components/FilterBar.tsx`:**
- Added `categoryCounts: Record<string, number>` prop — count of positive transactions per category
- Each chip shows a count badge (e.g. `Travel 5`) so the user can see how many transactions are in each category
- "None" button only appears when already in filtered mode (less clutter when all are selected)
- Status hint appears below chips when filtering is active: "Showing 2 of 8 categories — click a chip to toggle, 'All' to reset"
- Chip tooltip explains the click action: "Show only Travel", "Remove Travel", or "Add Travel"

**`frontend/src/App.tsx`:**
- Computes `categoryCounts` from all positive transactions and passes to `FilterBar`
- Smarter `toggleCategory` logic:
  - **All selected → click a chip** → isolates to only that category (one click to filter)
  - **Some selected → click active chip** → removes it; if last one, resets to all
  - **Some selected → click inactive chip** → adds it to the selection
  - **"All" button** → resets to show everything
