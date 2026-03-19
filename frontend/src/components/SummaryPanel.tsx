import type { Transaction } from "../api";

interface Props {
  transactions: Transaction[];
}

export default function SummaryPanel({ transactions }: Props) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          Summary — {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
          ${total.toFixed(2)}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {sorted.map(([cat, amount]) => (
          <div
            key={cat}
            style={{
              background: "#f3f4f6",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
            }}
          >
            <span style={{ color: "#6b7280" }}>{cat}</span>{" "}
            <span style={{ fontWeight: 600 }}>${amount.toFixed(2)}</span>{" "}
            <span style={{ color: "#9ca3af", fontSize: 11 }}>
              ({((amount / total) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
