import type { BookProject, Chapter } from "@/lib/types";

export function chapterPrompt(project: BookProject, chapter: Chapter, instruction?: string) {
  const minimumWords = Math.max(1200, Math.round(chapter.targetWords * 0.85));

  return `Tu rediges un chapitre complet pour un livre KDP.

Livre:
- Titre: ${project.title}
- Langue: ${project.language}
- Public: ${project.audience}
- Niche: ${project.niche}
- Ton: ${project.tone}
- Promesse: ${project.promise}

Chapitre:
- Titre: ${chapter.title}
- Resume: ${chapter.summary}
- Objectif pedagogique: ${chapter.learningGoal}
- Progression emotionnelle: ${chapter.emotionalShift}
- Cible ideale: ${chapter.targetWords} mots
- Minimum absolu: ${minimumWords} mots

Instruction specifique:
${instruction ?? "Version complete, concrete, humaine, pedagogique et dense, sans remplissage."}

Contraintes:
- Rends le chapitre long et exploitable, jamais miniature.
- Utilise une vraie structure avec sous-sections, exemples, transitions et conclusion locale.
- Pas de liste de notes seches si une vraie prose est plus adaptee.
- Pas de meta-commentaire sur l'IA.
- Ne coupe pas avant d'avoir vraiment traite le sujet.

Retourne UNIQUEMENT un JSON valide:
{
  "chapterContent": "..."
}`;
}
