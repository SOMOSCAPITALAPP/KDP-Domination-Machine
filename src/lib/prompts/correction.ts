import type { BookProject, Chapter } from "@/lib/types";

export function correctionPrompt(project: BookProject, chapter?: Chapter) {
  if (chapter) {
    return `Corrige ce chapitre sur l'orthographe, la fluidite, les repetitions, les formulations maladroites et la coherence.
Retourne du JSON avec chapterContent et alerts.

Chapitre:
${chapter.title}

Texte:
${chapter.content}`;
  }

  return `Corrige orthographe, fluidite, coherence globale et signale les promesses risquees.
Retourne du JSON avec correctionNotes et alerts.

Manuscrit:
${project.chapters.map((item) => `${item.title}\n${item.content}`).join("\n\n")}`;
}
