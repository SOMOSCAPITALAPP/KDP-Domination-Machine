import { Badge } from "@/components/ui/badge";
import type { BookProject } from "@/lib/types";

export function ProjectCard({ project }: { project: BookProject }) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-ink">{project.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{project.promise}</p>
        </div>
        <Badge>{project.status}</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Score" value={`${project.commercialScore}/100`} />
        <Metric label="Chapitres" value={`${project.chapters.length}`} />
        <Metric label="Mots" value={`${project.chapters.reduce((sum, item) => sum + item.wordCount, 0)}`} />
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
    </div>
  );
}

