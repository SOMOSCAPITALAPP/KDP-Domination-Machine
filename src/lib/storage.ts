import { initialCompliance } from "@/lib/constants";
import type { BookProject, BookProjectInput } from "@/lib/types";
import { createChapter, uid } from "@/lib/utils";

const STORAGE_KEY = "kdp-domination-machine-projects";

export function createProject(input: BookProjectInput): BookProject {
  const chapterCount =
    input.format === "50 pages" ? 10 : input.format === "100 pages" ? 12 : input.format === "200 pages" ? 14 : input.format === "250 pages" ? 16 : 18;
  const targetWords =
    input.format === "50 pages" ? 1200 : input.format === "100 pages" ? 1600 : input.format === "200 pages" ? 2200 : input.format === "250 pages" ? 2600 : 3000;

  return {
    ...input,
    id: uid("book"),
    status: "Idée",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 0,
    commercialScore: 72,
    promise: "",
    readerAvatar: "",
    painPoint: "",
    finalBenefit: "",
    differentiator: "",
    competitionRisks: "",
    amazonPositioning: "",
    tableOfContents: "",
    correctionNotes: "",
    alerts: [],
    ideas: [],
    chapters: Array.from({ length: chapterCount }, (_, index) => createChapter(index, targetWords)),
    compliance: initialCompliance(),
    packaging: {
      amazonDescription: "",
      bullets: [],
      keywords: [],
      categories: [],
      seoTitle: "",
      seoSubtitle: "",
      authorBio: "",
      coverHook: "",
      coverBrief: ""
    }
  };
}

export function loadProjects(): BookProject[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BookProject[];
  } catch {
    return [];
  }
}

export function saveProjects(projects: BookProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

