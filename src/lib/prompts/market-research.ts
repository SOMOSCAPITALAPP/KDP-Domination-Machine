import type { BookProject } from "@/lib/types";

export function marketResearchPrompt(project: BookProject) {
  return `Analyse le potentiel de marché Amazon KDP pour cette niche.
Langue: ${project.language}
Niche: ${project.niche}
Public cible: ${project.audience}
Type: ${project.type}
Objectif commercial: ${project.businessGoal}
Retourne des observations actionnables sur la demande, saturation et angles vendeurs.`;
}

