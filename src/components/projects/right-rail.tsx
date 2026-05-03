import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { KDP_OFFICIAL_NOTES, MODULES } from "@/lib/constants";
import { googleDriveRoadmap } from "@/lib/google-drive";
import type { BookProject } from "@/lib/types";

export function RightRail({ activeProject }: { activeProject: BookProject | null }) {
  if (!activeProject) {
    return <aside className="panel p-5 text-sm text-slate-600">Aucun projet actif.</aside>;
  }

  const completedChecklist = activeProject.compliance.filter((item) => item.checked).length;
  const totalChecklist = activeProject.compliance.length;

  return (
    <aside className="space-y-4">
      <Card title="Score commercial">
        <div className="text-4xl font-semibold text-ink">{activeProject.commercialScore}</div>
        <p className="mt-2 text-sm text-slate-600">
          Score interne basé sur promesse, différenciation, lisibilité et potentiel niche.
        </p>
      </Card>

      <Card title="Progression projet">
        <Progress value={activeProject.progress} />
        <p className="mt-3 text-sm text-slate-600">{activeProject.progress}% du workflow estimé.</p>
      </Card>

      <Card title="Checklist IA KDP">
        <p className="text-sm text-slate-600">
          {completedChecklist}/{totalChecklist} items validés avant upload.
        </p>
        <div className="mt-3 space-y-2">
          {activeProject.compliance.slice(0, 5).map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-medium text-ink">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.note}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Modules V1">
        <div className="flex flex-wrap gap-2">
          {MODULES.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              {item}
            </span>
          ))}
        </div>
      </Card>

      <Card title="Références officielles KDP">
        <div className="space-y-3 text-sm">
          {KDP_OFFICIAL_NOTES.map((note) => (
            <div key={note.title} className="rounded-xl bg-slate-50 p-3">
              <p className="font-medium text-ink">{note.title}</p>
              <p className="mt-1 text-slate-600">{note.summary}</p>
              <a className="mt-2 inline-block text-gold underline" href={note.url} target="_blank">
                Source officielle
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Google Drive / Sheets">
        <p className="text-sm text-slate-600">{googleDriveRoadmap.summary}</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {googleDriveRoadmap.items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </Card>
    </aside>
  );
}

