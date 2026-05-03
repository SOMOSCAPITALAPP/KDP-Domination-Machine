import OpenAI from "openai";
import { AI_MODEL_NAME, initialCompliance } from "@/lib/constants";
import { chapterPrompt } from "@/lib/prompts/chapter";
import { complianceChecklistPrompt } from "@/lib/prompts/compliance-checklist";
import { conceptPrompt } from "@/lib/prompts/concept";
import { correctionPrompt } from "@/lib/prompts/correction";
import { coverBriefPrompt } from "@/lib/prompts/cover-brief";
import { keywordPrompt } from "@/lib/prompts/keywords";
import { kdpDescriptionPrompt } from "@/lib/prompts/kdp-description";
import { outlinePrompt } from "@/lib/prompts/outline";
import { rewriteHumanPrompt } from "@/lib/prompts/rewrite-human";
import type {
  BookProject,
  Chapter,
  ComplianceItem,
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

  if (request.kind === "concept") return conceptPrompt(request.project);
  if (request.kind === "outline") return outlinePrompt(request.project);
  if (request.kind === "chapter" && chapter) return chapterPrompt(request.project, chapter);
  if (request.kind === "rewriteHuman") return rewriteHumanPrompt(request.project);
  if (request.kind === "develop" && chapter) {
    return chapterPrompt(
      request.project,
      chapter,
      "Developpe fortement le chapitre, ajoute de la profondeur, des transitions et des applications concretes."
    );
  }
  if (request.kind === "simplify" && chapter) {
    return chapterPrompt(
      request.project,
      chapter,
      "Garde le fond mais simplifie le style, clarifie les idees et rends la lecture plus fluide."
    );
  }
  if (request.kind === "examples" && chapter) {
    return chapterPrompt(
      request.project,
      chapter,
      "Ajoute beaucoup plus d'exemples, de cas concrets, de situations et d'applications immediates."
    );
  }
  if (request.kind === "correction") return correctionPrompt(request.project);
  if (request.kind === "packaging") return kdpDescriptionPrompt(request.project);
  if (request.kind === "keywords") return keywordPrompt(request.project);
  if (request.kind === "coverBrief") return coverBriefPrompt(request.project);
  return complianceChecklistPrompt(request.project);
}

function getMaxCompletionTokens(kind: GenerationKind) {
  if (kind === "chapter" || kind === "develop" || kind === "examples") return 14000;
  if (kind === "simplify" || kind === "rewriteHuman") return 12000;
  if (kind === "outline") return 7000;
  if (kind === "concept" || kind === "packaging") return 5000;
  return 3000;
}

async function askModel(kind: GenerationKind, prompt: string) {
  const sdk = getClient();
  if (!sdk) return null;

  const response = await sdk.chat.completions.create({
    model: AI_MODEL_NAME,
    temperature: kind === "chapter" || kind === "develop" || kind === "examples" ? 0.8 : 0.55,
    max_completion_tokens: getMaxCompletionTokens(kind),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu es un ghostwriter KDP senior. Retourne toujours un JSON valide, complet et directement exploitable."
      },
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0]?.message?.content ?? null;
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
      targetWords: asNumber(current.targetWords, project.chapters[index]?.targetWords || plan.targetWords),
      wordCount: project.chapters[index]?.wordCount || 0,
      content: project.chapters[index]?.content || ""
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

function normalizePayload(request: GenerationRequest, payload: Record<string, unknown>) {
  if (request.kind === "concept") {
    return {
      ideas: normalizeIdeas(payload.ideas, request.project.niche, request.project.audience),
      commercialScore: Math.max(55, Math.min(99, asNumber(payload.commercialScore, request.project.commercialScore + 5))),
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
    const manuscript = asStringArray(payload.manuscript);
    return {
      manuscript:
        manuscript.length > 0
          ? manuscript
          : request.project.chapters.map((chapter) => chapter.content)
    } satisfies GeneratedPayload;
  }

  if (request.kind === "correction") {
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

function buildChapterFallback(project: BookProject, chapter?: Chapter, kind: GenerationKind = "chapter"): GeneratedPayload {
  const current = chapter || project.chapters[0];
  const targetWords = current?.targetWords || 1800;
  const sectionCount = Math.max(5, Math.round(targetWords / 650));
  const sections = Array.from({ length: sectionCount }, (_, index) => {
    const part = index + 1;
    return [
      `### Section ${part}`,
      `Ce passage developpe un angle concret du chapitre ${current?.title || "en cours"} et fait avancer le lecteur vers la promesse du livre.`,
      "Explique le principe, montre pourquoi il compte maintenant, puis illustre-le avec une situation credible et une action precise.",
      kind === "examples"
        ? "Ajoute ici un exemple plus detaille, un cas pratique et une mini mise en situation pour ancrer l'idee."
        : kind === "simplify"
          ? "La formulation reste plus simple, plus directe et plus facile a appliquer rapidement."
          : kind === "develop"
            ? "La version va plus loin dans le raisonnement, les nuances, les transitions et les applications terrain."
            : "La version reste dense, pedagogique et orientee execution."
    ].join("\n\n");
  }).join("\n\n");

  return {
    chapterContent: [
      current?.title || "Chapitre",
      "",
      `Objectif de ce chapitre: ${current?.learningGoal || "faire avancer le lecteur avec une etape claire."}`,
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
        "Le sujet peut rester trop concurrentiel si la promesse manque de specificity ou d'angle proprietaire.",
      amazonPositioning: `Livre ${request.project.type} a promesse claire pour la niche ${request.project.niche}.`
    };
  }

  if (request.kind === "outline") {
    return buildOutlineFallback(request.project);
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
    return {
      manuscript: request.project.chapters.map(
        (item) =>
          `${item.content}\n\nVoix retravaillee: phrases plus naturelles, transitions plus humaines et ton moins mecanique.`
      )
    };
  }

  if (request.kind === "correction") {
    return {
      correctionNotes:
        "Correction V1: alleger les repetitions, varier les ouvertures de paragraphes, renforcer les transitions et verifier les formulations trop absolues.",
      alerts: [
        "Verifier toute promesse absolue liee a la sante, a la finance ou au droit.",
        "Relire la coherence du niveau de ton entre introduction, chapitres et conclusion."
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
  if (!chapterId || !payload.chapterContent) return false;
  const chapter = project.chapters.find((item) => item.id === chapterId);
  if (!chapter) return false;
  return countWords(payload.chapterContent) < Math.max(1500, Math.round(chapter.targetWords * 0.8));
}

function ensureChapterMinimumLength(
  project: BookProject,
  chapterId: string | undefined,
  payload: GeneratedPayload,
  kind: GenerationKind
) {
  if (!chapterId || !payload.chapterContent) return payload;
  const chapter = project.chapters.find((item) => item.id === chapterId);
  if (!chapter) return payload;

  const currentWords = countWords(payload.chapterContent);
  const minimumWords = Math.max(1500, Math.round(chapter.targetWords * 0.8));
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
- Minimum indispensable: ${Math.max(1200, Math.round(chapter.targetWords * 0.85))} mots

Draft actuel:
${draft}

Reprends ce chapitre et livre une version beaucoup plus complete, plus longue, plus utile, avec sous-sections, exemples, transitions et conclusion locale.

Retourne UNIQUEMENT un JSON:
{
  "chapterContent": "..."
}`;
}

export async function generateBookAsset(request: GenerationRequest): Promise<GeneratedPayload> {
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

  return normalized;
}
