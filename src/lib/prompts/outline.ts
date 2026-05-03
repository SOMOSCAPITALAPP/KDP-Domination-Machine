import type { BookProject } from "@/lib/types";

export function outlinePrompt(project: BookProject) {
  return `Crée le plan détaillé d'un livre Amazon KDP.
Titre: ${project.title}
Promesse: ${project.promise}
Format: ${project.format}
Niveau de profondeur: ${project.depth}
Retourne du JSON avec tableOfContents et chapters (10 à 18 chapitres) incluant title, summary, learningGoal, emotionalShift, targetWords.`;
}

