import { AI_MODEL_NAME } from "@/lib/constants";
import type { BookFormat, BookProject, Chapter, TranslationLanguage, TrimSize } from "@/lib/types";

export function cn(...inputs: Array<string | undefined | false | null>) {
  return inputs.filter(Boolean).join(" ");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getFormatPlan(format: BookFormat) {
  if (format === "50 pages") {
    return { chapterCount: 10, targetWords: 1800, totalWordsGoal: 18000 };
  }
  if (format === "100 pages") {
    return { chapterCount: 12, targetWords: 2600, totalWordsGoal: 31200 };
  }
  if (format === "200 pages") {
    return { chapterCount: 14, targetWords: 3800, totalWordsGoal: 53200 };
  }
  if (format === "250 pages") {
    return { chapterCount: 16, targetWords: 4300, totalWordsGoal: 68800 };
  }
  return { chapterCount: 18, targetWords: 4800, totalWordsGoal: 86400 };
}

export function defaultTrimSize(): TrimSize {
  return "6 x 9 in";
}

export function createChapter(index: number, targetWords: number): Chapter {
  return {
    id: uid("chapter"),
    title: `Chapitre ${index + 1}`,
    summary: "",
    learningGoal: "",
    emotionalShift: "",
    targetWords,
    wordCount: 0,
    content: "",
    illustrationPrompt: "",
    sourceContent: "",
    selectedIllustrationPrompt: "",
    selectedIllustrationDataUrl: ""
  };
}

export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

export function getTotalWordCount(project: BookProject) {
  return project.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
}

export function getTotalWordGoal(project: BookProject) {
  return project.chapters.reduce((sum, chapter) => sum + chapter.targetWords, 0);
}

export function inferFormatFromWordCount(words: number): BookFormat {
  if (words <= 22000) return "50 pages";
  if (words <= 38000) return "100 pages";
  if (words <= 60000) return "200 pages";
  if (words <= 76000) return "250 pages";
  return "300 pages";
}

export function getTranslationLanguageLabel(language: TranslationLanguage) {
  switch (language) {
    case "anglais":
      return "anglais";
    case "espagnol":
      return "espagnol";
    case "portugais du bresil":
      return "portugais du Bresil";
    case "italien":
      return "italien";
    case "allemand":
      return "allemand";
    case "hollandais":
      return "hollandais";
    default:
      return language;
  }
}

export function estimatePaperbackPageCount(project: BookProject) {
  const actualWords = getTotalWordCount(project);
  const estimatedWords = actualWords > 0 ? actualWords : getTotalWordGoal(project);
  return Math.max(24, Math.ceil(estimatedWords / 230) + 6);
}

export function getKdpMarginPreset(pageCount: number, bleed: boolean) {
  const insideMarginIn =
    pageCount <= 150
      ? 0.375
      : pageCount <= 300
        ? 0.5
        : pageCount <= 500
          ? 0.625
          : pageCount <= 700
            ? 0.75
            : 0.875;

  return {
    insideMarginIn,
    outsideMarginIn: bleed ? 0.375 : 0.375,
    topMarginIn: 0.75,
    bottomMarginIn: 0.75
  };
}

export function getTrimSizeDimensions(trimSize: TrimSize, bleed: boolean) {
  const base =
    trimSize === "5 x 8 in"
      ? { widthIn: 5, heightIn: 8 }
      : trimSize === "8.5 x 11 in"
        ? { widthIn: 8.5, heightIn: 11 }
        : { widthIn: 6, heightIn: 9 };

  if (!bleed) return base;

  return {
    widthIn: base.widthIn + 0.125,
    heightIn: base.heightIn + 0.25
  };
}

export function estimateProgress(project: BookProject) {
  let done = 0;
  const total = 10;
  if (project.promise) done += 1;
  if (project.tableOfContents) done += 1;
  if (project.frontMatter.authorName) done += 1;
  if (project.frontMatter.introduction) done += 1;
  if (project.chapters.some((chapter) => chapter.content.trim().length > 0)) done += 1;
  if (project.chapters.every((chapter) => chapter.wordCount >= Math.round(chapter.targetWords * 0.75))) done += 1;
  if (project.chapters.every((chapter) => chapter.illustrationPrompt.trim().length > 0)) done += 1;
  if (project.correctionNotes) done += 1;
  if (project.packaging.amazonDescription) done += 1;
  if (project.compliance.some((item) => item.checked)) done += 1;
  return Math.round((done / total) * 100);
}

export function formatChapterMarkdown(chapter: Chapter) {
  return `## ${chapter.title}\n\n${chapter.summary}\n\nIllustration suggeree: ${chapter.illustrationPrompt}\n\n${chapter.content}`.trim();
}

export function getPdfPreviewMeta(project: BookProject) {
  const pageCount = estimatePaperbackPageCount(project);
  const margins = getKdpMarginPreset(pageCount, project.paperback.bleed);

  return {
    pageCount,
    trimSize: project.paperback.trimSize,
    bleed: project.paperback.bleed,
    insideMarginIn: margins.insideMarginIn,
    outsideMarginIn: margins.outsideMarginIn,
    topMarginIn: margins.topMarginIn,
    bottomMarginIn: margins.bottomMarginIn,
    estimatedWords: getTotalWordCount(project) || getTotalWordGoal(project),
    model: AI_MODEL_NAME
  };
}
