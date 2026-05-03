import type { BookProject } from "@/lib/types";

export function kdpDescriptionPrompt(project: BookProject) {
  return `Génère un packaging KDP vendeur et propre.
Retourne du JSON avec packaging.amazonDescription, bullets, categories, seoTitle, seoSubtitle, authorBio, coverHook.
Livre: ${project.title}
Promesse: ${project.promise}
Positionnement Amazon: ${project.amazonPositioning}`;
}

