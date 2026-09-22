import { useState } from "react";
import type { Transaction } from "../api";

interface Props {
  transactions: Transaction[];
  categoryOptions: string[];
  onUpdateCategory: (transaction: Transaction, newCategory: string) => void;
}

type SortKey = "date" | "description" | "category" | "amount";
type SortDir = "asc" | "desc";

export default function TransactionTable({ transactions, categoryOptions, onUpdateCategory }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "amount") {
      cmp = a.amount - b.amount;
    } else {
      cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  if (transactions.length === 0) {
    return (
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "32px",
          textAlign: "center",
          color: "#6b7280",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        }}
      >
        No transactions match the current filters.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            {(
              [
                ["date", "Date"],
                ["description", "Description"],
                ["category", "Category"],
                ["amount", "Amount"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <th
                key={key}
                onClick={() => toggleSort(key)}
                style={{
                  padding: "10px 16px",
                  textAlign: key === "amount" ? "right" : "left",
                  fontWeight: 600,
                  cursor: "pointer",
                  userSelect: "none",
                  color: sortKey === key ? "#4f46e5" : "#374151",
                  whiteSpace: "nowrap",
                }}
              >
                {label}{arrow(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "1px solid #f3f4f6",
                background: i % 2 === 0 ? "#fff" : "#fafafa",
              }}
            >
              <td style={{ padding: "10px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                {t.date}
              </td>
              <td style={{ padding: "10px 16px", maxWidth: 320 }}>
                {t.description}
              </td>
              <td style={{ padding: "10px 16px" }}>
                <select
                  value={t.category}
                  onChange={(e) => onUpdateCategory(t, e.target.value)}
                  style={{
                    background: "#eef2ff",
                    color: "#4f46e5",
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 500,
                    border: "1px solid #c7d2fe",
                    cursor: "pointer",
                  }}
                >
                  {(categoryOptions.includes(t.category)
                    ? categoryOptions
                    : [t.category, ...categoryOptions]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </td>
              <td
                style={{
                  padding: "10px 16px",
                  textAlign: "right",
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: t.amount < 0 ? "#16a34a" : "inherit",
                }}
              >
                {t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(2)}` : `$${t.amount.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
