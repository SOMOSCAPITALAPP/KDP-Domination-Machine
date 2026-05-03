import type { BookProject } from "@/lib/types";

export function frontMatterPrompt(project: BookProject) {
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
- La preface doit etre concise, credible et editoriale.
- L'introduction doit donner envie de lire, cadrer la promesse et expliquer la progression du livre.
- N'invente pas un vrai ISBN officiel si aucun n'est fourni: propose plutot une valeur placeholder claire si necessaire.`;
}
