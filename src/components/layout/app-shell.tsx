"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookDashboard } from "@/components/dashboard/book-dashboard";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BookWorkspace } from "@/components/projects/book-workspace";
import { RightRail } from "@/components/projects/right-rail";
import { demoProject } from "@/lib/demo-data";
import { createProject, loadProjects, saveProjects } from "@/lib/storage";
import type {
  BookProject,
  BookProjectInput,
  BookStatus
} from "@/lib/types";

export function AppShell() {
  const router = useRouter();
  const [projects, setProjects] = useState<BookProject[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const items = loadProjects();
    if (items.length === 0) {
      saveProjects([demoProject]);
      setProjects([demoProject]);
      setActiveId(demoProject.id);
    } else {
      setProjects(items);
      setActiveId(items[0]?.id ?? "");
    }
    setHydrated(true);
  }, []);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeId) ?? null,
    [activeId, projects]
  );

  function persist(nextProjects: BookProject[]) {
    setProjects(nextProjects);
    saveProjects(nextProjects);
  }

  function upsertProject(project: BookProject) {
    const nextProjects = projects.map((item) => (item.id === project.id ? project : item));
    persist(nextProjects);
  }

  function createNewProject(input: BookProjectInput) {
    const project = createProject(input);
    const nextProjects = [project, ...projects];
    persist(nextProjects);
    setActiveId(project.id);
  }

  function updateStatus(projectId: string, status: BookStatus) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    upsertProject({ ...project, status, updatedAt: new Date().toISOString() });
  }

  async function importJson(file: File) {
    const text = await file.text();
    const imported = JSON.parse(text) as BookProject[];
    persist(imported);
    setActiveId(imported[0]?.id ?? "");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  if (!hydrated) {
    return <div className="p-8 text-sm text-slate-600">Chargement de l’atelier...</div>;
  }

  return (
    <main className="grid min-h-screen gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
      <Sidebar
        activeId={activeId}
        onSelect={setActiveId}
        onStatusChange={updateStatus}
        onCreate={createNewProject}
        onImport={importJson}
        projects={projects}
      />
      <section className="space-y-4">
        <Topbar activeProject={activeProject} onLogout={logout} projects={projects} />
        {activeProject ? (
          <BookWorkspace project={activeProject} onProjectChange={upsertProject} />
        ) : (
          <BookDashboard projects={projects} />
        )}
      </section>
      <RightRail activeProject={activeProject} />
    </main>
  );
}

