import os
import tempfile
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from parsers.registry import get_parser
from categorizer import list_categories

app = FastAPI(title="StatementAnalysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload")
async def upload_statements(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    all_transactions = []
    errors = []

    for file in files:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            errors.append(f"{file.filename}: only PDF files are supported.")
            continue

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        try:
            parser = get_parser(tmp_path)
            transactions = parser.parse(tmp_path)
            all_transactions.extend(transactions)
        except Exception as e:
            errors.append(f"{file.filename}: {e}")
        finally:
            os.unlink(tmp_path)

    if errors and not all_transactions:
        raise HTTPException(status_code=422, detail="; ".join(errors))

    categories = sorted({t.category for t in all_transactions})
    return {
        "transactions": [t.to_dict() for t in all_transactions],
        "categories": categories,
        "errors": errors,
    }


@app.get("/categories")
def get_categories():
    return {"categories": list_categories()}


@app.get("/health")
def health():
    return {"status": "ok"}
