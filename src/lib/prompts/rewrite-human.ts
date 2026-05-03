import type { BookProject, Chapter } from "@/lib/types";

export function rewriteHumanPrompt(project: BookProject, chapter?: Chapter) {
  if (chapter) {
    return `Reecris ce chapitre pour le rendre plus humain, plus naturel et moins repetitif.
Supprime les tournures trop generiques d'IA, garde le fond, preserve le sens et ameliore la fluidite.
Retourne du JSON avec chapterContent.

Chapitre:
${chapter.title}

Texte:
${chapter.content}`;
  }

  return `Reecris ce manuscrit pour le rendre plus humain, plus naturel et moins repetitif.
Supprime les tournures trop generiques d'IA, garde le fond et augmente la fluidite.
Retourne du JSON avec manuscript, un tableau de chapitres reecrits dans l'ordre.

Manuscrit:
${project.chapters.map((item) => `${item.title}\n${item.content}`).join("\n\n")}`;
}
