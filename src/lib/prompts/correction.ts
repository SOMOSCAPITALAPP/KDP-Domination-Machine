import type { BookProject } from "@/lib/types";

export function correctionPrompt(project: BookProject) {
  return `Corrige orthographe, fluidité, cohérence globale et signale les promesses risquées.
Retourne du JSON avec correctionNotes et alerts.
Manuscrit:
${project.chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join("\n\n")}`;
}

