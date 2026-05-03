import type { BookProject } from "@/lib/types";

export function coverBriefPrompt(project: BookProject) {
  return `Génère un brief de couverture pour Canva, Midjourney ou un designer.
Inclure ambiance, typographie, promesse visuelle, composition, couleurs, éléments interdits.
Retourne du JSON avec packaging.coverBrief et packaging.coverHook.
Livre: ${project.title}
Sous-promesse: ${project.promise}
Ton: ${project.tone}`;
}

