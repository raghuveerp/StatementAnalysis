import type { Transaction } from "../api";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

interface Props {
  transactions: Transaction[];
}

const COLORS = [
  "#4f46e5", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#ca8a04", "#16a34a", "#0891b2", "#0284c7", "#9333ea",
  "#c026d3", "#65a30d",
];

export default function ChartsView({ transactions }: Props) {
  // Only positives for spending charts; negatives shown separately
  const positives = transactions.filter((t) => t.amount > 0);
  const refunds = transactions.filter((t) => t.amount < 0);

  // --- Category breakdown (pie) ---
  const byCategory = positives.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});
  const pieData = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  // --- Monthly spending (bar) ---
  const byMonth = positives.reduce<Record<string, number>>((acc, t) => {
    const month = t.date.slice(0, 7); // YYYY-MM
    acc[month] = (acc[month] ?? 0) + t.amount;
    return acc;
  }, {});
  // Also track refunds per month
  const refundsByMonth = refunds.reduce<Record<string, number>>((acc, t) => {
    const month = t.date.slice(0, 7);
    acc[month] = (acc[month] ?? 0) + Math.abs(t.amount);
    return acc;
  }, {});
  const allMonths = [...new Set([...Object.keys(byMonth), ...Object.keys(refundsByMonth)])].sort();
  const barData = allMonths.map((m) => ({
    month: formatMonth(m),
    Spending: parseFloat((byMonth[m] ?? 0).toFixed(2)),
    Refunds: parseFloat((refundsByMonth[m] ?? 0).toFixed(2)),
  }));

  // --- Top merchants (bar) ---
  const byMerchant = positives.reduce<Record<string, number>>((acc, t) => {
    const key = t.description.length > 30 ? t.description.slice(0, 30) + "…" : t.description;
    acc[key] = (acc[key] ?? 0) + t.amount;
    return acc;
  }, {});
  const topMerchants = Object.entries(byMerchant)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Category pie + monthly bar side by side */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <ChartCard title="Spending by Category" style={{ flex: "1 1 380px" }}>
          {pieData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Monthly Spending vs Refunds" style={{ flex: "1 1 380px" }}>
          {barData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="Spending" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Refunds" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top merchants */}
      <ChartCard title="Top 10 Merchants by Spend">
        {topMerchants.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={topMerchants}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={200} />
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Bar dataKey="value" name="Amount" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        ...style,
      }}
    >
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>{title}</p>
      {children}
    </div>
  );
}

function Empty() {
  return <p style={{ color: "#9ca3af", fontSize: 14, padding: "32px 0", textAlign: "center" }}>No data</p>;
}

function formatMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[parseInt(month) - 1]} ${year.slice(2)}`;
}
