import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AI_MODEL_NAME, KDP_OFFICIAL_NOTES, MODULES } from "@/lib/constants";
import { googleDriveRoadmap } from "@/lib/google-drive";
import type { BookProject } from "@/lib/types";
import { getPdfPreviewMeta, getTotalWordCount, getTotalWordGoal } from "@/lib/utils";

export function RightRail({ activeProject }: { activeProject: BookProject | null }) {
  if (!activeProject) {
    return <aside className="panel p-5 text-sm text-slate-600">Aucun projet actif.</aside>;
  }

  const completedChecklist = activeProject.compliance.filter((item) => item.checked).length;
  const totalChecklist = activeProject.compliance.length;
  const pdfMeta = getPdfPreviewMeta(activeProject);
  const actualWords = getTotalWordCount(activeProject);
  const goalWords = getTotalWordGoal(activeProject);

  return (
    <aside className="space-y-4">
      <Card title="Modele IA">
        <div className="text-2xl font-semibold text-ink">{AI_MODEL_NAME}</div>
        <p className="mt-2 text-sm text-slate-600">
          L'application est verrouillee sur GPT 4.1 mini pour limiter les couts et garder un workflow constant.
        </p>
      </Card>

      <Card title="Score commercial">
        <div className="text-4xl font-semibold text-ink">{activeProject.commercialScore}</div>
        <p className="mt-2 text-sm text-slate-600">
          Score interne base sur promesse, differenciation, lisibilite et potentiel niche.
        </p>
      </Card>

      <Card title="Progression projet">
        <Progress value={activeProject.progress} />
        <p className="mt-3 text-sm text-slate-600">{activeProject.progress}% du workflow estime.</p>
      </Card>

      <Card title="Volume manuscrit">
        <p className="text-sm text-slate-600">
          {actualWords} mots ecrits sur {goalWords} mots cibles.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Estimation PDF interieur: {pdfMeta.pageCount} pages en {pdfMeta.trimSize}.
        </p>
      </Card>

      {activeProject.collectionTemplate ? (
        <Card title="Modele de collection">
          <p className="text-sm text-slate-600">
            Source: {activeProject.collectionTemplate.sourceFileName}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Collection: {activeProject.collectionTemplate.collectionName || "Non renseignee"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Nouveau volume: {activeProject.collectionTemplate.targetVolumeTopic || "Sujet a definir"}
          </p>
        </Card>
      ) : null}

      <Card title="Checklist IA KDP">
        <p className="text-sm text-slate-600">
          {completedChecklist}/{totalChecklist} items valides avant upload.
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

      <Card title="References officielles KDP">
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
