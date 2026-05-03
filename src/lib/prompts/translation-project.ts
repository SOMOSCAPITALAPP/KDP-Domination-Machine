import { getTranslationLanguageLabel } from "@/lib/utils";
import type { TranslationLanguage } from "@/lib/types";

export function translationProjectPrompt({
  sourceFileName,
  sourceType,
  extractedText,
  targetLanguage,
  suggestedFormat,
  detectedChapterCount
}: {
  sourceFileName: string;
  sourceType: "pdf" | "docx";
  extractedText: string;
  targetLanguage: TranslationLanguage;
  suggestedFormat: string;
  detectedChapterCount: number;
}) {
  return `Tu analyses un livre deja ecrit pour preparer une traduction professionnelle exploitable dans KDP.

Fichier source:
- Nom: ${sourceFileName}
- Type: ${sourceType}

Langue cible demandee: ${getTranslationLanguageLabel(targetLanguage)}
Format cible suggere: ${suggestedFormat}
Nombre de chapitres detectes: ${detectedChapterCount}

Mission:
- Identifier le titre, la promesse, la niche, le public, le ton et la structure du livre source.
- Preparer un nouveau projet de livre dans la langue cible.
- Traduire professionnellement les elements editoriaux visibles: titre, sous-titre implicite, table des matieres, titres de chapitres, resume de chapitres, preface, introduction si elles sont presentes.
- Rester fidele au sens, au niveau de langue, au ton et a l'intention commerciale du livre source.
- Ne pas inventer de nouveaux chapitres ni changer la logique du livre.
- Retourner un projet pret a etre traduit chapitre par chapitre par une IA experte en traduction.

Regles importantes:
- La traduction doit etre naturelle, idiomatique, professionnelle et publiable.
- Pas de traduction litterale maladroite.
- Pas de commentaires meta sur la traduction.
- Si la langue source n'est pas certaine, deduis-la au mieux.
- Tous les textes retournes doivent etre dans la langue cible, sauf le champ "sourceLanguage".

Retourne UNIQUEMENT un JSON valide:
{
  "title": "...",
  "language": "${getTranslationLanguageLabel(targetLanguage)}",
  "niche": "...",
  "audience": "...",
  "format": "${suggestedFormat}",
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
  "translationSource": {
    "sourceTitle": "...",
    "sourceLanguage": "...",
    "targetLanguage": "${targetLanguage}",
    "translationNotes": "..."
  }
}

Texte source a analyser:
${extractedText.slice(0, 22000)}`;
}
