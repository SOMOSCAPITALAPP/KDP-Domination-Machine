"use client";

import { Download, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookProject } from "@/lib/types";

const APP_BUILD = "ac6aeb3";

type TopbarProps = {
  activeProject: BookProject | null;
  projects: BookProject[];
  onLogout: () => Promise<void>;
};

export function Topbar({ activeProject, projects, onLogout }: TopbarProps) {
  function exportJson() {
    const blob = new Blob([JSON.stringify(projects, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "kdp-projects.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  return (
    <header className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-gold">Production desk</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          {activeProject?.title ?? "Selectionne un projet"}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {activeProject
            ? `${activeProject.format} - ${activeProject.type} - ${activeProject.language}`
            : "Cree un nouveau livre pour commencer."}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          Build {APP_BUILD}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={exportJson}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
        <Button variant="secondary" className="bg-ink text-white hover:bg-slate-900">
          <Sparkles className="mr-2 h-4 w-4" />
          Mode sprint
        </Button>
        <Button variant="ghost" onClick={() => void onLogout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Deconnexion
        </Button>
      </div>
    </header>
  );
}
