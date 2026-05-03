import type { BookProject } from "@/lib/types";

export function rewriteHumanPrompt(project: BookProject) {
  return `Réécris ce manuscrit pour le rendre plus humain, plus naturel et moins répétitif.
Supprime les tournures trop génériques d'IA, garde le fond et augmente la fluidité.
Retourne du JSON avec manuscript, un tableau de chapitres réécrits dans l'ordre.
Manuscrit:
${project.chapters.map((chapter) => `${chapter.title}\n${chapter.content}`).join("\n\n")}`;
}

