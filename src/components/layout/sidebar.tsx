"use client";

import { useRef } from "react";
import { ImportCollectionTemplateDialog } from "@/components/projects/import-collection-template-dialog";
import { NewBookDialog } from "@/components/projects/new-book-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUSES } from "@/lib/constants";
import type {
  BookFormat,
  BookProject,
  BookProjectInput,
  BookStatus,
  ImportWorkflowMode,
  TranslationLanguage
} from "@/lib/types";

type SidebarProps = {
  projects: BookProject[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (input: BookProjectInput) => void;
  onImport: (file: File) => Promise<void>;
  onImportTemplate: (payload: {
    file: File;
    mode: ImportWorkflowMode;
    targetVolumeTopic?: string;
    format?: BookFormat;
    targetLanguage?: TranslationLanguage;
  }) => Promise<void>;
  onStatusChange: (projectId: string, status: BookStatus) => void;
};

export function Sidebar({
  projects,
  activeId,
  onSelect,
  onCreate,
  onImport,
  onImportTemplate,
  onStatusChange
}: SidebarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <aside className="panel flex flex-col gap-6 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Workflow</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">KDP Machine</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Atelier privé pour passer d’une idée brute à un package KDP prêt à publier.
        </p>
      </div>

      <div className="space-y-3">
        <NewBookDialog onCreate={onCreate} />
        <ImportCollectionTemplateDialog onImport={onImportTemplate} />
        <Button
          className="w-full bg-white text-ink hover:bg-slate-50"
          variant="secondary"
          onClick={() => inputRef.current?.click()}
        >
          Importer JSON
        </Button>
        <input
          ref={inputRef}
          hidden
          accept=".json"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImport(file);
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Projets
        </p>
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                project.id === activeId
                  ? "border-gold bg-amber-50"
                  : "border-slate-200 bg-white/60 hover:border-slate-300"
              }`}
              onClick={() => onSelect(project.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{project.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{project.niche}</p>
                </div>
                <Badge>{project.status}</Badge>
              </div>
              <select
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                value={project.status}
                onChange={(event) =>
                  onStatusChange(project.id, event.target.value as BookStatus)
                }
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
