interface Props {
  categories: string[];
  categoryCounts: Record<string, number>;
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  minAmount: string;
  onMinAmountChange: (val: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export default function FilterBar({
  categories,
  categoryCounts,
  selectedCategories,
  onToggleCategory,
  minAmount,
  onMinAmountChange,
  onSelectAll,
  onClearAll,
}: Props) {
  const allSelected = selectedCategories.size === categories.length;
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
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>Filters</span>

        {/* Min amount */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            marginLeft: "auto",
          }}
        >
          Min amount $
          <input
            type="number"
            min={0}
            step={1}
            value={minAmount}
            onChange={(e) => onMinAmountChange(e.target.value)}
            placeholder="0"
            style={{
              width: 90,
              padding: "4px 8px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 14,
            }}
          />
        </label>
      </div>

      {/* Category chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button onClick={onSelectAll} style={chipStyle(allSelected)}>All</button>
        {!allSelected && (
          <button onClick={onClearAll} style={chipStyle(false)}>None</button>
        )}
        {categories.map((cat) => {
          const active = selectedCategories.has(cat);
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => onToggleCategory(cat)}
              style={chipStyle(active)}
              title={allSelected ? `Show only ${cat}` : active ? `Remove ${cat}` : `Add ${cat}`}
            >
              {cat}
              <span style={{
                marginLeft: 5,
                fontSize: 11,
                opacity: 0.7,
                fontWeight: 400,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {!allSelected && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
          Showing {selectedCategories.size} of {categories.length} categories — click a chip to toggle, "All" to reset
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 12px",
    borderRadius: 20,
    border: `1px solid ${active ? "#4f46e5" : "#d1d5db"}`,
    background: active ? "#eef2ff" : "#f9fafb",
    color: active ? "#4f46e5" : "#374151",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.1s",
  };
}
