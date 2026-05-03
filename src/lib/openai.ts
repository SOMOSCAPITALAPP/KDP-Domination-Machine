import OpenAI from "openai";
import { AI_MODEL_NAME, defaultFrontMatter, initialCompliance } from "@/lib/constants";
import { chapterPrompt } from "@/lib/prompts/chapter";
import { chapterImagePrompt } from "@/lib/prompts/chapter-images";
import { complianceChecklistPrompt } from "@/lib/prompts/compliance-checklist";
import { conceptPrompt } from "@/lib/prompts/concept";
import { correctionPrompt } from "@/lib/prompts/correction";
import { coverBriefPrompt } from "@/lib/prompts/cover-brief";
import { frontMatterPrompt } from "@/lib/prompts/front-matter";
import { keywordPrompt } from "@/lib/prompts/keywords";
import { kdpDescriptionPrompt } from "@/lib/prompts/kdp-description";
import { outlinePrompt } from "@/lib/prompts/outline";
import { rewriteHumanPrompt } from "@/lib/prompts/rewrite-human";
import { translationChapterPrompt } from "@/lib/prompts/translation-chapter";
import type {
  BookProject,
  Chapter,
  ChapterImageOption,
  ComplianceItem,
  FrontMatterData,
  GeneratedPayload,
  GenerationKind,
  GenerationRequest
} from "@/lib/types";
import { countWords, getFormatPlan, uid } from "@/lib/utils";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    });
  }
  return client;
}

function buildPrompt(request: GenerationRequest) {
  const chapter = request.project.chapters.find((item) => item.id === request.chapterId);
  const translationTarget = request.project.translationSource?.targetLanguage;

  if (request.kind === "concept") return conceptPrompt(request.project);
  if (request.kind === "outline") return outlinePrompt(request.project);
  if (request.kind === "frontMatter") return frontMatterPrompt(request.project);
  if (request.kind === "chapterImages" && chapter) return chapterImagePrompt(request.project, chapter);
  if (request.kind === "chapter" && chapter) {
    if (translationTarget && chapter.sourceContent.trim()) {
      return translationChapterPrompt({
        project: request.project,
        chapter,
        targetLanguage: translationTarget
      });
    }
    return chapterPrompt(request.project, chapter);
  }
  if (request.kind === "rewriteHuman") {
    return chapter ? rewriteHumanPrompt(request.project, chapter) : rewriteHumanPrompt(request.project);
  }
  if (request.kind === "develop" && chapter) {
    if (translationTarget && chapter.sourceContent.trim()) {
      return translationChapterPrompt({
        project: request.project,
        chapter,
        targetLanguage: translationTarget,
        instruction:
          "Reprends la traduction complete de facon encore plus fluide, idiomatique et editoriale, sans ajouter de contenu."
      });
    }
    return chapterPrompt(
      request.project,
      chapter,
      "Developpe fortement le chapitre, ajoute de la profondeur, des transitions, des applications concretes et des paragraphes plus riches."
    );
  }
  if (request.kind === "simplify" && chapter) {
    if (translationTarget && chapter.sourceContent.trim()) {
      return translationChapterPrompt({
        project: request.project,
        chapter,
        targetLanguage: translationTarget,
        instruction:
          "Traduis le chapitre avec une formulation plus simple et plus accessible dans la langue cible, sans rien omettre d'important."
      });
    }
    return chapterPrompt(
      request.project,
      chapter,
      "Garde le fond mais simplifie le style, clarifie les idees et rends la lecture plus fluide, tout en gardant un volume important."
    );
  }
  if (request.kind === "examples" && chapter) {
    if (translationTarget && chapter.sourceContent.trim()) {
      return translationChapterPrompt({
        project: request.project,
        chapter,
        targetLanguage: translationTarget,
        instruction:
          "Traduis fidelement les exemples existants et rends-les naturels dans la langue cible, sans en inventer de nouveaux."
      });
    }
    return chapterPrompt(
      request.project,
      chapter,
      "Ajoute beaucoup plus d'exemples, de cas concrets, de situations vecues et d'applications immediates."
    );
  }
  if (request.kind === "correction") {
    return chapter ? correctionPrompt(request.project, chapter) : correctionPrompt(request.project);
  }
  if (request.kind === "packaging") return kdpDescriptionPrompt(request.project);
  if (request.kind === "keywords") return keywordPrompt(request.project);
  if (request.kind === "coverBrief") return coverBriefPrompt(request.project);
  return complianceChecklistPrompt(request.project);
}

function getMaxCompletionTokens(kind: GenerationKind) {
  if (kind === "chapter" || kind === "develop" || kind === "examples") return 16000;
  if (kind === "simplify" || kind === "rewriteHuman") return 14000;
  if (kind === "outline") return 8000;
  if (kind === "frontMatter") return 4500;
  if (kind === "concept" || kind === "packaging") return 5000;
  return 3000;
}

async function askModel(kind: GenerationKind, prompt: string) {
  const sdk = getClient();
  if (!sdk) return null;

  const response = await sdk.chat.completions.create({
    model: AI_MODEL_NAME,
    temperature:
      kind === "chapter" || kind === "develop" || kind === "examples"
        ? 0.82
        : kind === "frontMatter"
          ? 0.65
          : 0.55,
    max_completion_tokens: getMaxCompletionTokens(kind),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu es un ghostwriter KDP senior. Retourne toujours un JSON valide, complet, exploitable et sans commentaires meta."
      },
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0]?.message?.content ?? null;
}

async function generateChapterImages(project: BookProject, chapterId?: string) {
  const sdk = getClient();
  const chapter = project.chapters.find((item) => item.id === chapterId);
  if (!sdk || !chapter) return null;

  const response = await sdk.images.generate({
    model: "gpt-image-1",
    prompt: chapterImagePrompt(project, chapter),
    n: 3,
    size: "1024x1024",
    quality: "low"
  });

  const images: ChapterImageOption[] = (response.data ?? [])
    .map((item, index) => {
      const b64 = typeof item.b64_json === "string" ? item.b64_json : "";
      if (!b64) return null;

      return {
        id: `${chapter.id}-image-${index + 1}`,
        prompt: `${chapter.title} - option ${index + 1}`,
        imageDataUrl: `data:image/png;base64,${b64}`
      } satisfies ChapterImageOption;
    })
    .filter((item): item is ChapterImageOption => Boolean(item));

  return images;
}

function safeJsonParse(raw: string | null) {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : [];
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIdeas(value: unknown, niche: string, audience: string) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 10).map((idea, index) => {
    const current = typeof idea === "object" && idea ? (idea as Record<string, unknown>) : {};

    return {
      title: asString(current.title) || `${niche || "Niche"} - idee ${index + 1}`,
      subtitle: asString(current.subtitle),
      score: Math.max(50, Math.min(99, asNumber(current.score, 70 + index))),
      angle: asString(current.angle) || `Angle adapte a ${audience || "ce public"}.`
    };
  });
}

function normalizeOutline(project: BookProject, payload: Record<string, unknown>) {
  const plan = getFormatPlan(project.format);
  const rawChapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  const fallbackLines = asString(payload.tableOfContents)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const chapters: Chapter[] = [];

  for (let index = 0; index < plan.chapterCount; index += 1) {
    const current =
      typeof rawChapters[index] === "object" && rawChapters[index]
        ? (rawChapters[index] as Record<string, unknown>)
        : {};

    const title =
      asString(current.title) ||
      fallbackLines[index] ||
      `${index + 1}. ${project.niche || "Sujet"} - etape ${index + 1}`;

    chapters.push({
      id: project.chapters[index]?.id || uid("chapter"),
      title,
      summary:
        asString(current.summary) ||
        `Ce chapitre fait progresser le lecteur sur l'etape ${index + 1} du livre.`,
      learningGoal:
        asString(current.learningGoal) ||
        "Transformer une idee forte en action concrete et memorisable.",
      emotionalShift:
        asString(current.emotionalShift) ||
        "Passer de la confusion a une vision plus claire et plus confiante.",
      illustrationPrompt:
        asString(current.illustrationPrompt) ||
        `Photo simple, forte et lisible pour illustrer ${title.toLowerCase()}.`,
      targetWords: Math.max(
        plan.targetWords,
        asNumber(current.targetWords, project.chapters[index]?.targetWords || plan.targetWords)
      ),
      wordCount: project.chapters[index]?.wordCount || 0,
      content: project.chapters[index]?.content || "",
      sourceContent: project.chapters[index]?.sourceContent || "",
      selectedIllustrationPrompt:
        project.chapters[index]?.selectedIllustrationPrompt || "",
      selectedIllustrationDataUrl:
        project.chapters[index]?.selectedIllustrationDataUrl || ""
    });
  }

  return {
    tableOfContents:
      asString(payload.tableOfContents) || chapters.map((chapter) => chapter.title).join("\n"),
    chapters
  };
}

function normalizeCompliance(value: unknown) {
  const base = initialCompliance();
  if (!Array.isArray(value)) return base;

  return base.map((item) => {
    const current = value.find(
      (entry) =>
        typeof entry === "object" && entry !== null && "id" in entry && (entry as ComplianceItem).id === item.id
    ) as Partial<ComplianceItem> | undefined;

    return current
      ? {
          ...item,
          checked: Boolean(current.checked),
          note: current.note || item.note,
          label: current.label || item.label
        }
      : item;
  });
}

function normalizeFrontMatter(value: unknown, project: BookProject) {
  const base = defaultFrontMatter();
  const current =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  const suggestedAuthor = project.frontMatter.authorName || project.packaging.authorBio ? "Auteur a confirmer" : "";

  return {
    authorName: asString(current.authorName) || project.frontMatter.authorName || suggestedAuthor,
    publisherName: asString(current.publisherName) || project.frontMatter.publisherName,
    collectionName: asString(current.collectionName) || project.frontMatter.collectionName,
    isbn: asString(current.isbn) || project.frontMatter.isbn || "ISBN a renseigner",
    editionNote: asString(current.editionNote) || project.frontMatter.editionNote || base.editionNote,
    copyrightNotice:
      asString(current.copyrightNotice) ||
      project.frontMatter.copyrightNotice ||
      `Copyright ${new Date().getFullYear()} - Tous droits reserves.`,
    dedication: asString(current.dedication) || project.frontMatter.dedication,
    preface: asString(current.preface) || project.frontMatter.preface,
    introduction: asString(current.introduction) || project.frontMatter.introduction
  } satisfies FrontMatterData;
}

function normalizePayload(request: GenerationRequest, payload: Record<string, unknown>) {
  if (request.kind === "concept") {
    return {
      ideas: normalizeIdeas(payload.ideas, request.project.niche, request.project.audience),
      commercialScore: Math.max(
        55,
        Math.min(99, asNumber(payload.commercialScore, request.project.commercialScore + 5))
      ),
      promise:
        asString(payload.promise) ||
        `Aider ${request.project.audience || "le lecteur"} a obtenir un resultat concret dans ${request.project.niche || "sa niche"}.`,
      readerAvatar:
        asString(payload.readerAvatar) ||
        `${request.project.audience || "Lecteur cible"} qui veut une transformation claire et credible.`,
      painPoint:
        asString(payload.painPoint) ||
        `Le lecteur se sent bloque dans ${request.project.niche || "son sujet"} et cherche un cadre fiable.`,
      finalBenefit:
        asString(payload.finalBenefit) || "Un resultat visible, applicable et durable.",
      differentiator:
        asString(payload.differentiator) ||
        `Approche ${request.project.tone} avec structure orientee action et lisibilite Amazon.`,
      competitionRisks:
        asString(payload.competitionRisks) ||
        "Le sujet peut rester concurrentiel si l'angle et la promesse ne sont pas assez specifiques.",
      amazonPositioning:
        asString(payload.amazonPositioning) ||
        `Livre ${request.project.type} a promesse claire pour la niche ${request.project.niche}.`
    } satisfies GeneratedPayload;
  }

  if (request.kind === "outline") {
    return normalizeOutline(request.project, payload);
  }

  if (request.kind === "frontMatter") {
    return {
      frontMatter: normalizeFrontMatter(payload.frontMatter ?? payload, request.project)
    } satisfies GeneratedPayload;
  }

  if (
    request.kind === "chapter" ||
    request.kind === "develop" ||
    request.kind === "simplify" ||
    request.kind === "examples"
  ) {
    return {
      chapterContent: asString(payload.chapterContent)
    } satisfies GeneratedPayload;
  }

  if (request.kind === "rewriteHuman") {
    if (request.chapterId) {
      return {
        chapterContent: asString(payload.chapterContent)
      } satisfies GeneratedPayload;
    }
    const manuscript = asStringArray(payload.manuscript);
    return {
      manuscript:
        manuscript.length > 0
          ? manuscript
          : request.project.chapters.map((chapter) => chapter.content)
    } satisfies GeneratedPayload;
  }

  if (request.kind === "correction") {
    if (request.chapterId) {
      return {
        chapterContent: asString(payload.chapterContent),
        alerts: asStringArray(payload.alerts)
      } satisfies GeneratedPayload;
    }
    return {
      correctionNotes: asString(payload.correctionNotes),
      alerts: asStringArray(payload.alerts)
    } satisfies GeneratedPayload;
  }

  if (request.kind === "packaging" || request.kind === "keywords" || request.kind === "coverBrief") {
    const rawPackaging =
      typeof payload.packaging === "object" && payload.packaging
        ? (payload.packaging as Record<string, unknown>)
        : payload;

    return {
      packaging: {
        amazonDescription: asString(rawPackaging.amazonDescription),
        bullets: asStringArray(rawPackaging.bullets),
        keywords: asStringArray(rawPackaging.keywords),
        categories: asStringArray(rawPackaging.categories),
        seoTitle: asString(rawPackaging.seoTitle),
        seoSubtitle: asString(rawPackaging.seoSubtitle),
        authorBio: asString(rawPackaging.authorBio),
        coverHook: asString(rawPackaging.coverHook),
        coverBrief: asString(rawPackaging.coverBrief)
      }
    } satisfies GeneratedPayload;
  }

  return {
    compliance: normalizeCompliance(payload.compliance),
    alerts: asStringArray(payload.alerts)
  } satisfies GeneratedPayload;
}

function buildOutlineFallback(project: BookProject): GeneratedPayload {
  return normalizeOutline(project, {});
}

function buildFrontMatterFallback(project: BookProject): GeneratedPayload {
  return {
    frontMatter: {
      authorName: project.frontMatter.authorName || "Auteur a renseigner",
      publisherName: project.frontMatter.publisherName || "Maison d'edition a renseigner",
      collectionName: project.frontMatter.collectionName || "Collection a renseigner",
      isbn: project.frontMatter.isbn || "ISBN a renseigner",
      editionNote: project.frontMatter.editionNote || "Premiere edition",
      copyrightNotice:
        project.frontMatter.copyrightNotice ||
        `Copyright ${new Date().getFullYear()} - Tous droits reserves.`,
      dedication: project.frontMatter.dedication || "",
      preface:
        project.frontMatter.preface ||
        `Ce livre a ete concu pour guider ${project.audience || "le lecteur"} avec clarte, serieux et application immediate.`,
      introduction:
        project.frontMatter.introduction ||
        `Dans ce livre, nous allons transformer ${project.promise || "une promesse centrale"} en progression concrete grace a un parcours clair, etape par etape.`
    }
  };
}

function buildChapterFallback(project: BookProject, chapter?: Chapter, kind: GenerationKind = "chapter"): GeneratedPayload {
  const current = chapter || project.chapters[0];
  if (project.translationSource && current?.sourceContent.trim()) {
    return {
      chapterContent: current.sourceContent
    };
  }
  const targetWords = current?.targetWords || 2200;
  const sectionCount = Math.max(6, Math.round(targetWords / 550));
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const part = index + 1;
    return [
      `### Section ${part}`,
      `Ce passage developpe un angle concret du chapitre ${current?.title || "en cours"} et fait avancer le lecteur vers la promesse du livre.`,
      "Explique le principe, montre pourquoi il compte maintenant, puis illustre-le avec une situation credible, une nuance utile et une action precise.",
      kind === "examples"
        ? "Ajoute ici un exemple detaille, un cas pratique et une mini mise en situation pour ancrer l'idee en profondeur."
        : kind === "simplify"
          ? "La formulation reste plus simple, plus directe et plus facile a appliquer, sans reduire la richesse du contenu."
          : kind === "develop"
            ? "La version va plus loin dans le raisonnement, les nuances, les transitions, les objections et les applications terrain."
            : "La version reste dense, pedagogique, orientee execution et assez longue pour constituer un vrai chapitre."
    ].join("\n\n");
  }).join("\n\n");

  return {
    chapterContent: [
      current?.title || "Chapitre",
      "",
      sections,
      "",
      "Conclusion locale",
      "Le lecteur repart avec une comprehension plus nette, une etape actionnable et une meilleure progression vers le resultat final."
    ].join("\n")
  };
}

function fallbackGeneration(request: GenerationRequest): GeneratedPayload {
  const chapter = request.project.chapters.find((item) => item.id === request.chapterId);

  if (request.kind === "concept") {
    return {
      ideas: Array.from({ length: 10 }, (_, index) => ({
        title: `${request.project.niche || "Niche"} - idee ${index + 1}`,
        subtitle: `Sous-titre oriente resultat ${index + 1}`,
        score: 72 + index,
        angle: `Angle differenciant ${index + 1} pour ${request.project.audience || "ce public"}.`
      })),
      commercialScore: Math.min(95, request.project.commercialScore + 8),
      promise: `Aider ${request.project.audience || "le lecteur"} a obtenir un resultat concret dans la niche ${request.project.niche}.`,
      readerAvatar: `${request.project.audience || "Lecteur cible"} qui veut une transformation concrete et credible.`,
      painPoint: `Le lecteur se sent bloque dans ${request.project.niche} et cherche un cadre fiable.`,
      finalBenefit: "Un resultat visible, applicable et rassurant.",
      differentiator: `Approche ${request.project.tone} avec structure orientee action et lisibilite Amazon.`,
      competitionRisks:
        "Le sujet peut rester trop concurrentiel si la promesse manque de specificite ou d'angle proprietaire.",
      amazonPositioning: `Livre ${request.project.type} a promesse claire pour la niche ${request.project.niche}.`
    };
  }

  if (request.kind === "outline") {
    return buildOutlineFallback(request.project);
  }

  if (request.kind === "frontMatter") {
    return buildFrontMatterFallback(request.project);
  }

  if (
    request.kind === "chapter" ||
    request.kind === "develop" ||
    request.kind === "simplify" ||
    request.kind === "examples"
  ) {
    return buildChapterFallback(request.project, chapter, request.kind);
  }

  if (request.kind === "rewriteHuman") {
    if (chapter) {
      return {
        chapterContent: chapter.content
      };
    }
    return {
      manuscript: request.project.chapters.map((item) => item.content)
    };
  }

  if (request.kind === "correction") {
    if (chapter) {
      return {
        chapterContent: chapter.content,
        alerts: [
          "Verifier les promesses trop absolues ou sensibles dans ce chapitre.",
          "Relire le rythme, les transitions et la fluidite finale avant export."
        ]
      };
    }
    return {
      correctionNotes:
        "Correction V1: alleger les repetitions, varier les ouvertures de paragraphes, renforcer les transitions et verifier les formulations trop absolues.",
      alerts: [
        "Verifier toute promesse absolue liee a la sante, a la finance ou au droit.",
        "Relire la coherence du niveau de ton entre preface, introduction, chapitres et conclusion."
      ]
    };
  }

  if (request.kind === "packaging") {
    return {
      packaging: {
        amazonDescription:
          "<p>Un guide clair, concret et dense pour aider le lecteur a passer de la confusion a l'action avec une methode credible et applicable.</p>",
        bullets: [
          "Promesse claire et transformation concrete",
          "Structure fluide, pedagogique et rapide a appliquer",
          "Lecture orientee progression reelle",
          "Ton credible sans jargon inutile",
          "Exemples concrets et utilisables",
          "Positionnement premium mais accessible",
          "Concu pour une audience Amazon bien ciblee"
        ],
        categories: ["Business & Money", "Self-Help"],
        seoTitle: request.project.title,
        seoSubtitle: request.project.promise || "Sous-titre optimise KDP",
        authorBio:
          "Auteur specialise dans la transformation d'idees complexes en livres clairs, vendables et directement actionnables.",
        coverHook: "Une promesse credible. Une methode claire. Un vrai resultat."
      }
    };
  }

  if (request.kind === "keywords") {
    return {
      packaging: {
        keywords: [
          request.project.niche,
          request.project.type,
          request.project.audience,
          "amazon kdp",
          "guide pratique",
          "livre francais"
        ].filter(Boolean) as string[],
        categories: ["Business & Money", "Reference"]
      }
    };
  }

  if (request.kind === "coverBrief") {
    return {
      packaging: {
        coverHook: "Clarte immediate. Resultat visible. Promesse credible.",
        coverBrief:
          "Creer une couverture premium, lisible en miniature, avec un titre fort, peu d'elements, une palette nette et aucun bruit visuel."
      }
    };
  }

  return {
    compliance: initialCompliance(),
    alerts: [
      "Declarer le contenu AI-generated si le texte final vient directement de l'IA.",
      "Preparer un fichier interieur PDF distinct du fichier couverture paperback."
    ]
  };
}

function needsChapterExpansion(project: BookProject, chapterId: string | undefined, payload: GeneratedPayload) {
  if (project.translationSource) return false;
  if (!chapterId || !payload.chapterContent) return false;
  const chapter = project.chapters.find((item) => item.id === chapterId);
  if (!chapter) return false;
  return countWords(payload.chapterContent) < Math.max(2200, Math.round(chapter.targetWords * 0.95));
}

function ensureChapterMinimumLength(
  project: BookProject,
  chapterId: string | undefined,
  payload: GeneratedPayload,
  kind: GenerationKind
) {
  if (project.translationSource) return payload;
  if (!chapterId || !payload.chapterContent) return payload;
  const chapter = project.chapters.find((item) => item.id === chapterId);
  if (!chapter) return payload;

  const currentWords = countWords(payload.chapterContent);
  const minimumWords = Math.max(2200, Math.round(chapter.targetWords * 0.95));
  if (currentWords >= minimumWords) return payload;

  const fallback = buildChapterFallback(project, chapter, kind).chapterContent || "";
  return {
    ...payload,
    chapterContent: `${payload.chapterContent}\n\n${fallback}`
  } satisfies GeneratedPayload;
}

function expansionPrompt(project: BookProject, chapter: Chapter, draft: string) {
  return `Le draft suivant est trop court pour le chapitre cible.

Objectif:
- Titre: ${chapter.title}
- Resume: ${chapter.summary}
- Objectif pedagogique: ${chapter.learningGoal}
- Cible ideale: ${chapter.targetWords} mots
- Minimum indispensable: ${Math.max(2200, Math.round(chapter.targetWords * 0.95))} mots

Draft actuel:
${draft}

Reprends ce chapitre et livre une version beaucoup plus complete, plus longue, plus utile, avec sous-sections, exemples, transitions et conclusion locale.
La sortie doit rester du manuscrit pur.

Retourne UNIQUEMENT un JSON:
{
  "chapterContent": "..."
}`;
}

export async function generateBookAsset(request: GenerationRequest): Promise<GeneratedPayload> {
  if (request.kind === "chapterImages") {
    const images = await generateChapterImages(request.project, request.chapterId);
    if (!images || images.length === 0) {
      return { chapterImages: [] };
    }

    return { chapterImages: images };
  }

  const prompt = buildPrompt(request);
  const raw = await askModel(request.kind, prompt);
  const parsed = safeJsonParse(raw);

  if (!parsed) {
    return fallbackGeneration(request);
  }

  let normalized: GeneratedPayload = normalizePayload(request, parsed) as GeneratedPayload;

  if (needsChapterExpansion(request.project, request.chapterId, normalized)) {
    const chapter = request.project.chapters.find((item) => item.id === request.chapterId);

    if (chapter) {
      const expandedRaw = await askModel(
        request.kind,
        expansionPrompt(request.project, chapter, normalized.chapterContent ?? "")
      );
      const expandedParsed = safeJsonParse(expandedRaw);
      if (expandedParsed) {
        normalized = normalizePayload(request, expandedParsed);
      }
    }
  }

  if (
    (request.kind === "chapter" ||
      request.kind === "develop" ||
      request.kind === "simplify" ||
      request.kind === "examples") &&
    !normalized.chapterContent
  ) {
    return buildChapterFallback(
      request.project,
      request.project.chapters.find((item) => item.id === request.chapterId),
      request.kind
    );
  }

  if (
    request.kind === "chapter" ||
    request.kind === "develop" ||
    request.kind === "simplify" ||
    request.kind === "examples"
  ) {
    return ensureChapterMinimumLength(request.project, request.chapterId, normalized, request.kind);
  }

  if (request.kind === "outline" && (!normalized.chapters || normalized.chapters.length === 0)) {
    return buildOutlineFallback(request.project);
  }

  if (request.kind === "frontMatter" && !normalized.frontMatter) {
    return buildFrontMatterFallback(request.project);
  }

  return normalized;
}
