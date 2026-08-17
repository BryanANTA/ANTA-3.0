const OPTIONS = [
  { value: "all", label: "All Images" },
  { value: "with", label: "With Images" },
  { value: "without", label: "No Images" },
];

export default function ImageStatusFilter({ active, onChange, counts = {} }) {
  return (
    <div className="inline-flex gap-1 bg-secondary rounded-lg p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`font-heading text-xs font-medium px-3 py-1.5 rounded-md whitespace-nowrap transition-colors
            ${active === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
            }`}
        >
          {opt.label}
          {counts[opt.value] !== undefined && (
            <span className="ml-1 opacity-60">({counts[opt.value]})</span>
          )}
        </button>
      ))}
    </div>
  );
}