
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "basketball", label: "Basketball" },
  { value: "training", label: "Training" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "apparel", label: "Apparel" },
  { value: "kids", label: "Kids" },
  { value: "accessories", label: "Accessories" },
];

export default function CategoryFilter({ active, onChange, counts = {} }) {
  return (
    <div className="flex gap-0 border-b border-border overflow-x-auto">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`font-heading text-sm font-medium px-5 py-3 whitespace-nowrap border-b-2 transition-colors
            ${active === cat.value
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
        >
          {cat.label}
          {counts[cat.value] !== undefined && (
            <span className="ml-1.5 text-xs opacity-60">({counts[cat.value]})</span>
          )}
        </button>
      ))}
    </div>
  );
}