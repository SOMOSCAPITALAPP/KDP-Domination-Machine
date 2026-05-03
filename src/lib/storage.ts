import { DEFAULT_PAPERBACK_LAYOUT, defaultFrontMatter, initialCompliance } from "@/lib/constants";
import type { BookProject, BookProjectInput, Chapter, ComplianceItem } from "@/lib/types";
import { createChapter, estimateProgress, getFormatPlan, uid } from "@/lib/utils";

const STORAGE_KEY = "kdp-domination-machine-projects";

export function createProject(input: BookProjectInput): BookProject {
  const plan = getFormatPlan(input.format);

  return {
    ...input,
    id: uid("book"),
    status: "Idee",
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
    chapters: Array.from({ length: plan.chapterCount }, (_, index) =>
      createChapter(index, plan.targetWords)
    ),
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
    },
    paperback: { ...DEFAULT_PAPERBACK_LAYOUT },
    frontMatter: defaultFrontMatter()
  };
}

function normalizeCompliance(items: unknown): ComplianceItem[] {
  const base = initialCompliance();
  if (!Array.isArray(items)) return base;

  return base.map((defaultItem) => {
    const incoming = items.find(
      (item) => typeof item === "object" && item !== null && "id" in item && item.id === defaultItem.id
    ) as Partial<ComplianceItem> | undefined;

    return incoming
      ? {
          ...defaultItem,
          checked: Boolean(incoming.checked),
          note: incoming.note || defaultItem.note,
          label: incoming.label || defaultItem.label
        }
      : defaultItem;
  });
}

function normalizeChapters(chapters: unknown, format: BookProjectInput["format"]) {
  const plan = getFormatPlan(format);
  const existing = Array.isArray(chapters) ? chapters : [];
  const normalized: Chapter[] = [];

  for (let index = 0; index < plan.chapterCount; index += 1) {
    const item = existing[index] as Partial<Chapter> | undefined;
    const fallback = createChapter(index, plan.targetWords);
    const content = typeof item?.content === "string" ? item.content : "";

    normalized.push({
      ...fallback,
      id: typeof item?.id === "string" && item.id ? item.id : fallback.id,
      title: typeof item?.title === "string" && item.title ? item.title : fallback.title,
      summary: typeof item?.summary === "string" ? item.summary : "",
      learningGoal: typeof item?.learningGoal === "string" ? item.learningGoal : "",
      emotionalShift: typeof item?.emotionalShift === "string" ? item.emotionalShift : "",
      illustrationPrompt: typeof item?.illustrationPrompt === "string" ? item.illustrationPrompt : "",
      targetWords:
        typeof item?.targetWords === "number" && Number.isFinite(item.targetWords)
          ? Math.max(item.targetWords, plan.targetWords)
          : plan.targetWords,
      content,
      wordCount:
        typeof item?.wordCount === "number" && Number.isFinite(item.wordCount)
          ? item.wordCount
          : content.split(/\s+/).filter(Boolean).length
    });
  }

  return normalized;
}

export function normalizeProject(raw: unknown): BookProject {
  const input = (raw ?? {}) as Partial<BookProject>;
  const base = createProject({
    title: input.title || "Nouveau projet KDP",
    language: input.language || "Francais",
    niche: input.niche || "",
    audience: input.audience || "",
    format: input.format || "100 pages",
    type: input.type || "guide pratique",
    tone: input.tone || "expert",
    businessGoal: input.businessGoal || "",
    depth: input.depth || "standard"
  });

  const project: BookProject = {
    ...base,
    ...input,
    createdAt: input.createdAt || base.createdAt,
    updatedAt: input.updatedAt || base.updatedAt,
    alerts: Array.isArray(input.alerts) ? input.alerts.filter((item): item is string => typeof item === "string") : [],
    ideas: Array.isArray(input.ideas)
      ? input.ideas.map((idea, index) => ({
          title: typeof idea?.title === "string" ? idea.title : `Idee ${index + 1}`,
          subtitle: typeof idea?.subtitle === "string" ? idea.subtitle : "",
          score:
            typeof idea?.score === "number" && Number.isFinite(idea.score)
              ? idea.score
              : 70 + index,
          angle: typeof idea?.angle === "string" ? idea.angle : ""
        }))
      : [],
    chapters: normalizeChapters(input.chapters, base.format),
    compliance: normalizeCompliance(input.compliance),
    packaging: {
      ...base.packaging,
      ...(typeof input.packaging === "object" && input.packaging ? input.packaging : {})
    },
    paperback: {
      ...DEFAULT_PAPERBACK_LAYOUT,
      ...(typeof input.paperback === "object" && input.paperback ? input.paperback : {})
    },
    frontMatter: {
      ...defaultFrontMatter(),
      ...(typeof input.frontMatter === "object" && input.frontMatter ? input.frontMatter : {})
    }
  };

  project.progress = estimateProgress(project);
  return project;
}

export function loadProjects(): BookProject[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown[];
    return Array.isArray(parsed) ? parsed.map(normalizeProject) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: BookProject[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
