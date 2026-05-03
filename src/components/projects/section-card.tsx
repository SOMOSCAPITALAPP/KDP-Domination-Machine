import type { ReactNode } from "react";

export function SectionCard({
  title,
  actions,
  children
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold text-ink">{title}</h3>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

