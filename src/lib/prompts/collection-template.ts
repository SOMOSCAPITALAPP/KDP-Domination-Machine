export function collectionTemplatePrompt({
  sourceFileName,
  sourceType,
  extractedText,
  collectionName,
  targetVolumeTopic
}: {
  sourceFileName: string;
  sourceType: "pdf" | "docx";
  extractedText: string;
  collectionName: string;
  targetVolumeTopic: string;
}) {
  return `Tu analyses un livre deja publie pour en faire un modele de collection KDP reutilisable.

Fichier source:
- Nom: ${sourceFileName}
- Type: ${sourceType}

Collection souhaitee: ${collectionName || "A deduire du livre source"}
Nouveau volume a produire: ${targetVolumeTopic || "A deduire"}

Mission:
- Identifier la structure recurrente du livre source.
- En deduire un gabarit de collection reutilisable.
- Adapter ce gabarit pour un nouveau volume centre sur "${targetVolumeTopic || "un nouveau sujet de la collection"}".
- Produire un nouveau projet KDP exploitable avec le meme esprit de sommaire.

Retourne UNIQUEMENT un JSON valide:
{
  "title": "...",
  "language": "Francais",
  "niche": "...",
  "audience": "...",
  "format": "100 pages",
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
    "targetVolumeTopic": "...",
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
