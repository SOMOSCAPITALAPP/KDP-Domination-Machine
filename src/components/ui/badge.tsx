export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
      {children}
    </span>
  );
}

