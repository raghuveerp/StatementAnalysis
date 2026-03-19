import { useState } from "react";
import { uploadStatements } from "./api";
import type { Transaction } from "./api";
import UploadZone from "./components/UploadZone";
import FilterBar from "./components/FilterBar";
import SummaryPanel from "./components/SummaryPanel";
import TransactionTable from "./components/TransactionTable";
import ChartsView from "./components/ChartsView";

type View = "table" | "charts";

// First word of description, lowercased — used to match refunds to purchases
function merchantKey(desc: string): string {
  return desc.trim().split(/\s+/)[0].toLowerCase();
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [minAmount, setMinAmount] = useState("");
  const [loadedFiles, setLoadedFiles] = useState<string[]>([]);
  const [view, setView] = useState<View>("table");

  async function handleFiles(files: File[]) {
    setLoading(true);
    setErrors([]);
    try {
      const data = await uploadStatements(files);
      setAllTransactions((prev) => {
        const merged = [...prev, ...data.transactions];
        const newCategories = sorted([...new Set(merged.map((t) => t.category))]);
        setCategories(newCategories);
        setSelectedCategories(new Set(newCategories));
        return merged;
      });
      setLoadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
      if (data.errors?.length) setErrors(data.errors);
    } catch (e: unknown) {
      setErrors([e instanceof Error ? e.message : "Unknown error"]);
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    setAllTransactions([]);
    setCategories([]);
    setSelectedCategories(new Set());
    setMinAmount("");
    setLoadedFiles([]);
    setErrors([]);
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      // If all categories are currently selected, clicking one isolates it
      if (prev.size === categories.length) {
        return new Set([cat]);
      }
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
        // If that was the last selected one, reset to all
        if (next.size === 0) return new Set(categories);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  // Count positive transactions per category (for chip badges)
  const categoryCounts = allTransactions.reduce<Record<string, number>>((acc, t) => {
    if (t.amount >= 0) acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {});

  // Step 1: apply category + min-amount filter to positive transactions
  const threshold = minAmount === "" ? null : parseFloat(minAmount);
  const filteredPositive = allTransactions.filter((t) => {
    if (t.amount < 0) return false;
    if (!selectedCategories.has(t.category)) return false;
    if (threshold !== null && t.amount < threshold) return false;
    return true;
  });

  // Step 2: collect merchants from passing positive transactions
  const passedMerchants = new Set(filteredPositive.map((t) => merchantKey(t.description)));

  // Step 3: include refunds whose merchant appears in the passing set
  const filteredRefunds = allTransactions.filter(
    (t) => t.amount < 0 && passedMerchants.has(merchantKey(t.description))
  );

  const filtered = [...filteredPositive, ...filteredRefunds].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const hasData = allTransactions.length > 0;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Statement Analysis</h1>
        {hasData && (
          <button
            onClick={clearAll}
            style={{
              fontSize: 13,
              color: "#6b7280",
              background: "none",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              padding: "2px 10px",
              cursor: "pointer",
            }}
          >
            Clear all
          </button>
        )}
      </div>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        Upload one or more PDF statements — transactions are merged across all files.
      </p>

      <UploadZone onFiles={handleFiles} loading={loading} />

      {loadedFiles.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {loadedFiles.map((name, i) => (
            <span
              key={i}
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 12,
                color: "#166534",
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            padding: "12px 16px",
            color: "#b91c1c",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {hasData && (
        <>
          <FilterBar
            categories={categories}
            categoryCounts={categoryCounts}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            minAmount={minAmount}
            onMinAmountChange={setMinAmount}
            onSelectAll={() => setSelectedCategories(new Set(categories))}
            onClearAll={() => setSelectedCategories(new Set())}
          />
          <SummaryPanel transactions={filtered} />

          {/* View toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["table", "charts"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 18px",
                  borderRadius: 8,
                  border: `1px solid ${view === v ? "#4f46e5" : "#d1d5db"}`,
                  background: view === v ? "#eef2ff" : "#fff",
                  color: view === v ? "#4f46e5" : "#374151",
                  fontWeight: view === v ? 600 : 400,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {view === "table" ? (
            <TransactionTable transactions={filtered} />
          ) : (
            <ChartsView transactions={filtered} />
          )}
        </>
      )}
    </div>
  );
}

function sorted(arr: string[]): string[] {
  return [...arr].sort((a, b) => a.localeCompare(b));
}
