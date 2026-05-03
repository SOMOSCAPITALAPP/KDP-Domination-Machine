import type { BookProject } from "@/lib/types";
import { getFormatPlan } from "@/lib/utils";

export function outlinePrompt(project: BookProject) {
  const plan = getFormatPlan(project.format);

  return `Tu construis le sommaire et le plan detaille d'un livre Amazon KDP.

Projet:
- Titre: ${project.title}
- Langue: ${project.language}
- Niche: ${project.niche}
- Public: ${project.audience}
- Ton: ${project.tone}
- Format cible: ${project.format}
- Niveau de profondeur: ${project.depth}
- Promesse: ${project.promise || "A definir clairement dans le plan"}

Contraintes:
- Produis exactement ${plan.chapterCount} chapitres.
- Chaque chapitre doit avoir un titre tres clair et specifique.
- Chaque resume doit tenir en 2 a 4 phrases.
- Chaque chapter.targetWords doit rester proche de ${plan.targetWords} mots.
- La progression emotionnelle doit faire avancer le lecteur du probleme vers le resultat.
- Le plan doit etre adapte a un vrai livre, pas a un article.

Retourne UNIQUEMENT un JSON valide de cette forme:
{
  "tableOfContents": "1. ...\\n2. ...",
  "chapters": [
    {
      "title": "1. ...",
      "summary": "...",
      "learningGoal": "...",
      "emotionalShift": "...",
      "targetWords": ${plan.targetWords}
    }
  ]
}`;
}
