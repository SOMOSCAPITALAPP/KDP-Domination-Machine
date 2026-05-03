type TabItem = {
  id: string;
  label: string;
};

export function Tabs({
  items,
  value,
  onChange
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="panel flex flex-wrap gap-2 p-3">
      {items.map((item) => (
        <button
          key={item.id}
          className={`rounded-2xl px-4 py-2 text-sm transition ${
            value === item.id
              ? "bg-ink text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
          onClick={() => onChange(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

