import type { BookProject, Chapter } from "@/lib/types";

export function chapterPrompt(project: BookProject, chapter: Chapter, instruction?: string) {
  const minimumWords = Math.max(1800, Math.round(chapter.targetWords * 0.95));
  const stretchWords = Math.max(minimumWords + 300, Math.round(chapter.targetWords * 1.08));

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
- Illustration prevue: ${chapter.illustrationPrompt || "A definir"}
- Cible ideale: ${chapter.targetWords} mots
- Minimum absolu: ${minimumWords} mots
- Objectif ambitieux: ${stretchWords} mots

Instruction specifique:
${instruction ?? "Version complete, concrete, humaine, pedagogique et dense, sans remplissage."}

Contraintes:
- Va au bout du sujet et vise le plus de mots utiles possible.
- Utilise une vraie structure de livre avec sous-parties naturelles, exemples et transitions.
- Pas de meta-commentaire sur l'IA.
- Pas de notes editoriales, pas d'explication de ta methode.
- Ne coupe pas avant d'avoir vraiment traite le sujet.
- La sortie doit etre du manuscrit pur.
- Interdiction d'ecrire des balises ou libelles comme: "Resume:", "Objectif pedagogique:", "Conclusion locale", "Section 1", "Section 2", etc.
- N'ajoute jamais de commentaires sur ce que fait le texte. Ecris seulement le texte du livre.

Retourne UNIQUEMENT un JSON valide:
{
  "chapterContent": "..."
}`;
}
