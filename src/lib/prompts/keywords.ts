import type { BookProject } from "@/lib/types";

export function keywordPrompt(project: BookProject) {
  return `Génère des mots-clés backend Amazon KDP utiles et spécifiques.
Retourne du JSON avec packaging.keywords et packaging.categories.
Niche: ${project.niche}
Public: ${project.audience}
Promesse: ${project.promise}`;
}

