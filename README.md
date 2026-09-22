# README

This file provides guidance for AI coding assistants when working with code in this repository.

## Commands

### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload          # starts on http://localhost:8000
```

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev                        # starts on http://localhost:5173
npm run build                      # production build + TypeScript check
```

## Architecture

Two independent services that communicate over HTTP:

**`backend/`** — Python FastAPI app
- `main.py` — single `/upload` endpoint: accepts a PDF, returns `{ transactions, categories }`
- `parsers/registry.py` — detects bank from PDF text and routes to the right parser
- `parsers/base.py` — `BaseParser` ABC; all bank parsers implement `can_parse(text)` and `parse(path)`
- `parsers/chase.py` — Chase-specific regex parser; `parsers/generic.py` is the fallback for all other banks
- `categorizer.py` — keyword-matching against `categories.yml`; returns a category string per transaction
- `models/transaction.py` — `Transaction` dataclass (date, description, amount, category, bank)

**`frontend/src/`** — React + TypeScript app
- `App.tsx` — top-level state: raw transactions, filter state (selected categories + min amount), filtered list
- `api.ts` — typed `uploadStatement(file)` fetch call
- `components/UploadZone.tsx` — drag-and-drop + file picker; calls `onFile` prop
- `components/FilterBar.tsx` — category chip toggles + min-amount input; all filtering is client-side
- `components/TransactionTable.tsx` — sortable table of filtered transactions
- `components/SummaryPanel.tsx` — per-category totals and percentages for the current filtered view

## Adding a New Bank Parser

1. Create `backend/parsers/<bankname>.py` implementing `BaseParser`
2. Register it in `parsers/registry.py` **before** `GenericParser()` in the `_PARSERS` list

## Adding/Editing Categories

Edit `backend/categories.yml` — each key is a category name, value is a list of case-insensitive keywords matched against the transaction description.

## Deploying

`render.yaml` at the repo root is a [Render Blueprint](https://render.com/docs/blueprint-spec) that deploys both services: `backend/` as a Python web service, `frontend/` as a static site.

1. On Render, create a new Blueprint from this repo — it reads `render.yaml` and provisions both services.
2. The blueprint hardcodes each service's predicted public URL into the other's config (`ALLOWED_ORIGINS` on the backend, `VITE_API_URL` on the frontend), based on the service names in `render.yaml`. Render only guarantees those names if they're not already taken in your account — after the first deploy, check the actual URLs it assigned and update these two env vars if they differ, then redeploy.
3. Locally, both env vars are optional: the backend defaults to allowing `localhost:5173`/`3000`, and the frontend defaults to same-origin requests (via the Vite dev proxy in `vite.config.ts`).
