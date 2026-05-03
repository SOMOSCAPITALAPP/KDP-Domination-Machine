import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookProject, Chapter } from "@/lib/types";

export function cn(...inputs: Array<string | undefined | false | null>) {
  return twMerge(clsx(inputs));
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

export function createChapter(index: number, targetWords: number): Chapter {
  return {
    id: uid("chapter"),
    title: `Chapitre ${index + 1}`,
    summary: "",
    learningGoal: "",
    emotionalShift: "",
    targetWords,
    wordCount: 0,
    content: ""
  };
}

export function estimateProgress(project: BookProject) {
  let done = 0;
  const total = 7;
  if (project.promise) done += 1;
  if (project.tableOfContents) done += 1;
  if (project.chapters.some((chapter) => chapter.content.trim().length > 0)) done += 1;
  if (project.correctionNotes) done += 1;
  if (project.packaging.amazonDescription) done += 1;
  if (project.compliance.some((item) => item.checked)) done += 1;
  if (project.chapters.every((chapter) => chapter.wordCount > 300)) done += 1;
  return Math.round((done / total) * 100);
}

export function formatChapterMarkdown(chapter: Chapter) {
  return `## ${chapter.title}\n\n${chapter.summary}\n\n${chapter.content}`.trim();
}

