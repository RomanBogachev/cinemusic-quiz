export function Tabs({ items, value, onChange }: { items: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="inline-flex rounded-full bg-black/[0.05] p-1">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${item === value ? "bg-white text-foreground shadow-soft" : "text-muted hover:text-foreground"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
