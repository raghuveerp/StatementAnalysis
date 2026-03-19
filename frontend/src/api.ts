export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  bank: string;
}

export interface UploadResponse {
  transactions: Transaction[];
  categories: string[];
  errors: string[];
}

export async function uploadStatements(files: File[]): Promise<UploadResponse> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail ?? "Upload failed");
  }

  return res.json();
}
