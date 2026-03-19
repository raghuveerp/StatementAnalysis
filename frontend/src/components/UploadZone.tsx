import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  loading: boolean;
}

export default function UploadZone({ onFiles, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (files.length) onFiles(files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    // Reset so the same file(s) can be re-selected if needed
    e.target.value = "";
  }

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "#4f46e5" : "#c7c7d1"}`,
        borderRadius: 12,
        padding: "40px 24px",
        textAlign: "center",
        cursor: loading ? "default" : "pointer",
        background: dragging ? "#eef2ff" : "#fff",
        transition: "border-color 0.15s, background 0.15s",
        marginBottom: 24,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        multiple
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
      {loading ? (
        <p style={{ color: "#6b7280" }}>Parsing statements…</p>
      ) : (
        <>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>
            Drop one or more PDF statements here
          </p>
          <p style={{ color: "#6b7280", fontSize: 14 }}>
            or click to browse — Chase, BofA, Wells Fargo, Capital One and more
          </p>
        </>
      )}
    </div>
  );
}
