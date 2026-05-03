export function collectionTemplatePrompt({
  sourceFileName,
  sourceType,
  extractedText,
  targetVolumeTopic,
  format
}: {
  sourceFileName: string;
  sourceType: "pdf" | "docx";
  extractedText: string;
  targetVolumeTopic: string;
  format: string;
}) {
  return `Tu analyses un livre deja publie pour en faire un modele de collection KDP reutilisable.

Fichier source:
- Nom: ${sourceFileName}
- Type: ${sourceType}

Nouveau sujet du livre a produire: ${targetVolumeTopic}
Longueur cible demandee: ${format}

Mission:
- Identifier la structure recurrente du livre source.
- Deduire automatiquement la collection, le positionnement, le ton, le lecteur cible et les caracteristiques editoriales a partir du livre source.
- Reutiliser le meme esprit de sommaire et la meme logique de progression, mais pour un nouveau livre centre sur "${targetVolumeTopic}".
- Respecter la longueur cible "${format}" en proposant un nombre de chapitres et des objectifs mots adaptes.
- Generer un projet KDP presque pret a rediger sans demander d'autres informations manuelles.

Regles importantes:
- Le nouveau livre doit etre original et ne pas recopier le texte du livre source.
- Il doit seulement reutiliser la structure editoriale, le rythme, le type de chapitres, l'approche pedagogique et l'esprit de collection.
- Deduis le nom de collection si possible depuis le contenu source. Si ce n'est pas clair, propose un nom de collection pertinent.
- Deduis aussi auteur, maison d'edition, ton, type de livre, niche et lecteur cible de facon plausible.

Retourne UNIQUEMENT un JSON valide:
{
  "title": "...",
  "language": "Francais",
  "niche": "...",
  "audience": "...",
  "format": "${format}",
  "type": "guide pratique",
  "tone": "pedagogique",
  "businessGoal": "...",
  "depth": "standard",
  "promise": "...",
  "readerAvatar": "...",
  "painPoint": "...",
  "finalBenefit": "...",
  "differentiator": "...",
  "competitionRisks": "...",
  "amazonPositioning": "...",
  "tableOfContents": "1. ...\\n2. ...",
  "frontMatter": {
    "authorName": "...",
    "publisherName": "...",
    "collectionName": "...",
    "isbn": "ISBN a renseigner",
    "editionNote": "...",
    "copyrightNotice": "...",
    "dedication": "...",
    "preface": "...",
    "introduction": "..."
  },
  "chapters": [
    {
      "title": "1. ...",
      "summary": "...",
      "learningGoal": "...",
      "emotionalShift": "...",
      "targetWords": 2600,
      "illustrationPrompt": "Photo simple, forte, editoriale"
    }
  ],
  "collectionTemplate": {
    "sourceTitle": "...",
    "collectionName": "...",
    "targetVolumeTopic": "${targetVolumeTopic}",
    "recurringPromise": "...",
    "structureNotes": "...",
    "chapterPattern": ["..."],
    "illustrationStyle": "...",
    "sourceExcerpt": "..."
  }
}

Texte source a analyser:
${extractedText.slice(0, 22000)}`;
}
