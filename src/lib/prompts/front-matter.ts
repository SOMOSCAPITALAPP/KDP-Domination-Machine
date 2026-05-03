import type { BookProject } from "@/lib/types";
import { getFormatPlan } from "@/lib/utils";

export function frontMatterPrompt(project: BookProject) {
  const plan = getFormatPlan(project.format);
  const prefaceMinWords = Math.max(700, Math.round(plan.targetWords * 0.22));
  const introductionMinWords = Math.max(1000, Math.round(plan.targetWords * 0.34));

  return `Tu prepares les elements editoriaux du debut de livre pour un paperback KDP.

Projet:
- Titre: ${project.title}
- Sous-titre potentiel: ${project.packaging.seoSubtitle || project.promise}
- Langue: ${project.language}
- Public: ${project.audience}
- Niche: ${project.niche}
- Ton: ${project.tone}
- Objectif commercial: ${project.businessGoal}

Retourne UNIQUEMENT un JSON valide avec:
{
  "frontMatter": {
    "authorName": "...",
    "publisherName": "...",
    "collectionName": "...",
    "isbn": "...",
    "editionNote": "...",
    "copyrightNotice": "...",
    "dedication": "...",
    "preface": "...",
    "introduction": "..."
  }
}

Contraintes:
- La preface doit etre vraiment developpee, credibile, elegante et editoriale.
- La preface doit faire au moins ${prefaceMinWords} mots.
- L'introduction doit etre vraiment developpee, donner envie de lire, cadrer la promesse, installer le contexte, presenter clairement le chemin du lecteur et faire au moins ${introductionMinWords} mots.
- Ecris du texte de livre final, pas des notes.
- Pas de listes seches, pas de meta-commentaire, pas de placeholders visibles dans la preface ou l'introduction.
- N'invente pas un vrai ISBN officiel si aucun n'est fourni: propose plutot une valeur placeholder claire si necessaire.`;
}
