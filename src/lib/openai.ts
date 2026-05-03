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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryAfterSeconds(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const candidate = error as {
    status?: number;
    message?: string;
    headers?: Record<string, string>;
  };

  if (candidate.status !== 429) return null;

  const headerValue =
    candidate.headers?.["retry-after"] ??
    candidate.headers?.["Retry-After"] ??
    null;

  if (headerValue) {
    const parsed = Number(headerValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
  }

  const match = candidate.message?.match(/try again in\s+(\d+)s/i);
  if (!match) return 15;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 15;
}

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
  if (kind === "chapter" || kind === "develop" || kind === "examples") return 22000;
  if (kind === "simplify" || kind === "rewriteHuman") return 14000;
  if (kind === "outline") return 8000;
  if (kind === "frontMatter") return 8000;
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

  const runRequest = async () =>
    sdk.images.generate({
      model: "gpt-image-1",
      prompt: chapterImagePrompt(project, chapter),
      n: 3,
      size: "1024x1024",
      quality: "low"
    });

  let response;

  try {
    response = await runRequest();
  } catch (error) {
    const retryAfterSeconds = extractRetryAfterSeconds(error);

    if (retryAfterSeconds && retryAfterSeconds <= 15) {
      await sleep((retryAfterSeconds + 1) * 1000);
      response = await runRequest();
    } else {
      throw error;
    }
  }

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
        [
          `Ce livre est ne d'un constat simple: ${project.audience || "le lecteur"} cherche rarement plus d'information brute, mais plutot un chemin fiable, progressif et rassurant pour avancer avec discernement dans ${project.niche || "ce sujet"}.`,
          `L'ambition de ces pages est donc de proposer un cadre solide, lisible et vraiment utile, avec un ton ${project.tone || "pedagogique"} qui privilegie la clarte, la nuance et l'application concrete.`,
          `Au fil du livre, chaque chapitre a ete pense pour apporter une pierre supplementaire a l'edifice: mieux comprendre, mieux choisir, mieux agir et, surtout, mieux integrer ce qui compte vraiment dans la vie du lecteur.`,
          `Si ce manuscrit peut tenir sa promesse, ce sera parce qu'il ne cherche ni l'effet de mode ni la formule vide, mais une progression serieuse, humaine et directement exploitable.`
        ].join("\n\n"),
      introduction:
        project.frontMatter.introduction ||
        [
          `Bienvenue dans un livre pense pour transformer ${project.promise || "une promesse centrale"} en progression concrete, lisible et durable.`,
          `Tu n'entres pas ici dans un simple survol du sujet. Le parcours a ete structure pour poser les bases, approfondir les points essentiels, faire le tri entre l'accessoire et l'utile, puis guider vers une mise en pratique reelle.`,
          `Le fil conducteur du livre repose sur une idee simple: une comprehension plus profonde produit de meilleures decisions, et de meilleures decisions changent la qualite des resultats dans la duree.`,
          `C'est pourquoi chaque partie a ete construite pour faire avancer le lecteur avec regularite: comprendre le contexte, identifier les principes clefs, reconnaitre les nuances importantes, puis traduire ces elements en actions claires et pertinentes.`,
          `En refermant ce livre, l'objectif est que le lecteur ne reparte pas seulement avec des informations, mais avec une vision plus ordonnee, une confiance plus stable et des reperes suffisamment solides pour agir avec plus de justesse.`
        ].join("\n\n")
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
  const targetWords = current?.targetWords || 2600;
  const sectionCount = Math.max(6, Math.round(targetWords / 650));
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const part = index + 1;
    const emphasis =
      kind === "examples"
        ? "Chaque developpement s'appuie sur un exemple concret, une situation plausible et une application immediate."
        : kind === "simplify"
          ? "Le propos reste clair, fluide et accessible, tout en gardant une vraie densite de fond."
          : kind === "develop"
            ? "Le propos va plus loin, ajoute des nuances utiles, des transitions plus riches et davantage d'applications concretes."
            : "Le propos reste dense, utile, progressif et suffisamment developpe pour constituer un vrai chapitre de livre.";

    return [
      `${part}. ${current?.title || "Chapitre"} - axe ${part}`,
      `Dans cette partie, le lecteur approfondit un angle essentiel du chapitre ${current?.title || ""}. L'explication avance pas a pas, relie les idees entre elles et montre pourquoi ce point compte reellement dans la progression globale du livre.`,
      `L'enjeu n'est pas seulement de comprendre une notion de plus, mais d'en tirer une lecture plus sure, une application plus juste et un meilleur discernement face aux situations concretes du terrain.`,
      emphasis
    ].join("\n\n");
  }).join("\n\n");

  return {
    chapterContent: sections
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
  return countWords(payload.chapterContent) < Math.max(2200, chapter.targetWords);
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
  const minimumWords = Math.max(2200, chapter.targetWords);
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
- Minimum indispensable: ${Math.max(2200, chapter.targetWords)} mots

Draft actuel:
${draft}

Reprends ce chapitre et livre une version beaucoup plus complete, plus longue, plus utile, avec de vraies sous-sections naturelles, des exemples, des transitions et des paragraphes consistants.
Ne produis aucun commentaire, aucun libelle meta et aucune "conclusion locale".
La sortie doit rester du manuscrit pur, pret a etre exporte dans un livre.

Retourne UNIQUEMENT un JSON:
{
  "chapterContent": "..."
}`;
}

function needsFrontMatterExpansion(payload: GeneratedPayload) {
  if (!payload.frontMatter) return false;
  const prefaceWords = countWords(payload.frontMatter.preface || "");
  const introductionWords = countWords(payload.frontMatter.introduction || "");
  return prefaceWords < 500 || introductionWords < 800;
}

function frontMatterExpansionPrompt(project: BookProject, payload: GeneratedPayload) {
  return `Les elements editoriaux suivants sont trop courts pour un paperback KDP premium.

Projet:
- Titre: ${project.title}
- Promesse: ${project.promise}
- Public: ${project.audience}
- Niche: ${project.niche}
- Ton: ${project.tone}

Preface actuelle:
${payload.frontMatter?.preface || ""}

Introduction actuelle:
${payload.frontMatter?.introduction || ""}

Reprends ces deux textes et livre une version nettement plus developpee, plus editoriale, plus fluide et plus premium.
- Preface visee: au moins 700 mots
- Introduction visee: au moins 1000 mots
- Aucun meta-commentaire
- Aucun placeholder visible

Retourne UNIQUEMENT un JSON valide:
{
  "frontMatter": {
    "authorName": "${project.frontMatter.authorName}",
    "publisherName": "${project.frontMatter.publisherName}",
    "collectionName": "${project.frontMatter.collectionName}",
    "isbn": "${project.frontMatter.isbn}",
    "editionNote": "${project.frontMatter.editionNote}",
    "copyrightNotice": "${project.frontMatter.copyrightNotice}",
    "dedication": "${project.frontMatter.dedication}",
    "preface": "...",
    "introduction": "..."
  }
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

  if (request.kind === "frontMatter" && needsFrontMatterExpansion(normalized)) {
    const expandedRaw = await askModel(request.kind, frontMatterExpansionPrompt(request.project, normalized));
    const expandedParsed = safeJsonParse(expandedRaw);
    if (expandedParsed) {
      normalized = normalizePayload(request, expandedParsed);
    }
  }

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
