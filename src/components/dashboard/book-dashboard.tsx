import { ProjectCard } from "@/components/dashboard/project-card";
import type { BookProject } from "@/lib/types";

export function BookDashboard({ projects }: { projects: BookProject[] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </section>
  );
}

