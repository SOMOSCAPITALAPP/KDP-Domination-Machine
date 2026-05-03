import { getTranslationLanguageLabel } from "@/lib/utils";
import type { BookProject, Chapter, TranslationLanguage } from "@/lib/types";

export function translationChapterPrompt({
  project,
  chapter,
  targetLanguage,
  instruction
}: {
  project: BookProject;
  chapter: Chapter;
  targetLanguage: TranslationLanguage;
  instruction?: string;
}) {
  return `Tu es un traducteur litteraire et editorial senior, specialise dans les livres grand public et KDP.

Mission:
- Traduire professionnellement le chapitre ci-dessous en ${getTranslationLanguageLabel(targetLanguage)}.
- Produire une version naturelle, fluide, idiomatique et publiable.
- Preserver le sens, le ton, le rythme, les exemples, la structure et les nuances du texte source.
- Ne rien omettre d'important.
- Ne pas ajouter d'informations qui n'existent pas dans le texte source.
- Si une formule sonne trop litterale, adapte-la avec elegance dans la langue cible.

Livre:
- Titre cible: ${project.title}
- Langue cible: ${project.language}
- Public: ${project.audience}
- Niche: ${project.niche}
- Ton: ${project.tone}

Chapitre cible:
- Titre: ${chapter.title}
- Resume: ${chapter.summary}
- Objectif pedagogique: ${chapter.learningGoal}

Instruction specifique:
${instruction ?? "Traduction integrale, professionnelle, fidele et naturelle, sans notes meta."}

Texte source a traduire:
${chapter.sourceContent || chapter.content}

Contraintes de sortie:
- La sortie doit etre du manuscrit pur.
- N'ecris jamais: "Resume:", "Objectif pedagogique:", "Conclusion locale", "Section 1", "Section 2" ou toute note de travail.
- Ne rajoute aucun commentaire explicatif sur la traduction.

Retourne UNIQUEMENT un JSON valide:
{
  "chapterContent": "..."
}`;
}
