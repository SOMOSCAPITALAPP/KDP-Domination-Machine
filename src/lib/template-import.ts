import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { AI_MODEL_NAME } from "@/lib/constants";
import { collectionTemplatePrompt } from "@/lib/prompts/collection-template";
import { translationProjectPrompt } from "@/lib/prompts/translation-project";
import { createProject, normalizeProject } from "@/lib/storage";
import type {
  BookFormat,
  BookProject,
  Chapter,
  CollectionTemplate,
  TranslationLanguage,
  TranslationSource
} from "@/lib/types";
import { countWords, inferFormatFromWordCount, uid } from "@/lib/utils";

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

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r/g, "").trim();
}

async function extractDocxText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value);
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeText(result.text);
  } finally {
    await parser.destroy();
  }
}

function inferSourceType(name: string): "pdf" | "docx" {
  return name.toLowerCase().endsWith(".docx") ? "docx" : "pdf";
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

function normalizeCollectionTemplate(
  fileName: string,
  sourceType: "pdf" | "docx",
  extractedText: string,
  value: unknown,
  fallbackTargetTopic: string
): CollectionTemplate {
  const current = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    sourceFileName: fileName,
    sourceTitle: asString(current.sourceTitle) || fileName.replace(/\.(pdf|docx)$/i, ""),
    sourceType,
    collectionName: asString(current.collectionName),
    targetVolumeTopic: asString(current.targetVolumeTopic) || fallbackTargetTopic,
    recurringPromise: asString(current.recurringPromise),
    structureNotes: asString(current.structureNotes),
    chapterPattern: Array.isArray(current.chapterPattern)
      ? current.chapterPattern.filter((item): item is string => typeof item === "string")
      : [],
    illustrationStyle: asString(current.illustrationStyle),
    sourceExcerpt: asString(current.sourceExcerpt) || extractedText.slice(0, 1200)
  };
}

function normalizeTranslationSource(
  fileName: string,
  sourceType: "pdf" | "docx",
  extractedText: string,
  targetLanguage: TranslationLanguage,
  value: unknown
): TranslationSource {
  const current = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    sourceFileName: fileName,
    sourceTitle: asString(current.sourceTitle) || fileName.replace(/\.(pdf|docx)$/i, ""),
    sourceType,
    sourceLanguage: asString(current.sourceLanguage) || "Langue source a confirmer",
    targetLanguage,
    translationNotes:
      asString(current.translationNotes) ||
      "Traduction professionnelle, fluide, fidele au sens, au ton et a l'intention commerciale du livre source.",
    sourceExcerpt: asString(current.sourceExcerpt) || extractedText.slice(0, 1200)
  };
}

function detectChapterHeading(line: string) {
  return /^(chapitre|chapter|capitulo|capitolo|kapitel|hoofdstuk)\b/i.test(line) ||
    /^\d+[\.\-:)]\s+\S+/.test(line) ||
    /^[IVXLCDM]+[\.\-:)]\s+\S+/i.test(line);
}

function normalizeHeading(line: string, index: number) {
  const clean = line.replace(/\s+/g, " ").trim();
  return clean || `Chapitre ${index + 1}`;
}

function splitParagraphBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function chunkParagraphs(paragraphs: string[], targetChunks: number) {
  const chunks: string[] = [];
  const chunkSize = Math.max(1, Math.ceil(paragraphs.length / targetChunks));

  for (let index = 0; index < paragraphs.length; index += chunkSize) {
    chunks.push(paragraphs.slice(index, index + chunkSize).join("\n\n"));
  }

  return chunks.filter(Boolean);
}

function segmentSourceChapters(text: string) {
  const lines = text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const headings = lines
    .map((line, index) => ({ line, index }))
    .filter((entry) => detectChapterHeading(entry.line));

  if (headings.length >= 3) {
    return headings.map((entry, index) => {
      const start = entry.index;
      const end = headings[index + 1]?.index ?? lines.length;
      const content = lines.slice(start + 1, end).join("\n\n").trim();

      return {
        heading: normalizeHeading(entry.line, index),
        sourceContent: content || entry.line
      };
    });
  }

  const paragraphs = splitParagraphBlocks(text);
  const estimatedChunks = Math.max(6, Math.min(18, Math.round(countWords(text) / 3500)));

  return chunkParagraphs(paragraphs, estimatedChunks).map((content, index) => ({
    heading: `Chapitre ${index + 1}`,
    sourceContent: content
  }));
}

function mergeTranslationChapters(
  project: BookProject,
  parsedChapters: unknown,
  sourceSegments: Array<{ heading: string; sourceContent: string }>
) {
  const raw = Array.isArray(parsedChapters) ? parsedChapters : [];
  const lastKnownChapter = project.chapters[project.chapters.length - 1];

  return sourceSegments.map((segment, index) => {
    const current =
      typeof raw[index] === "object" && raw[index] ? (raw[index] as Record<string, unknown>) : {};
    const fallback = project.chapters[index] ?? lastKnownChapter;
    const baseId = project.chapters[index]?.id || uid("chapter");

    return {
      ...(fallback ?? {
        id: baseId,
        title: segment.heading,
        summary: "",
        learningGoal: "",
        emotionalShift: "",
        targetWords: 2600,
        wordCount: 0,
        content: "",
        illustrationPrompt: "",
        sourceContent: "",
        selectedIllustrationPrompt: "",
        selectedIllustrationDataUrl: ""
      }),
      id: baseId,
      title: asString(current.title) || segment.heading,
      summary: asString(current.summary) || `Traduction de ${segment.heading}.`,
      learningGoal:
        asString(current.learningGoal) || "Restituer fidèlement le contenu dans la langue cible.",
      emotionalShift:
        asString(current.emotionalShift) ||
        "Preserver la progression du texte source avec une lecture naturelle.",
      targetWords:
        typeof current.targetWords === "number" && Number.isFinite(current.targetWords)
          ? current.targetWords
          : fallback?.targetWords || 2600,
      wordCount: 0,
      content: "",
      illustrationPrompt:
        asString(current.illustrationPrompt) ||
        `Photo simple, forte et editoriale pour illustrer ${asString(current.title) || segment.heading}.`,
      sourceContent: segment.sourceContent,
      selectedIllustrationPrompt: fallback?.selectedIllustrationPrompt || "",
      selectedIllustrationDataUrl: fallback?.selectedIllustrationDataUrl || ""
    } satisfies Chapter;
  });
}

export async function importCollectionTemplate({
  fileName,
  fileBuffer,
  targetVolumeTopic,
  format
}: {
  fileName: string;
  fileBuffer: Buffer;
  targetVolumeTopic: string;
  format: BookFormat;
}) {
  const sourceType = inferSourceType(fileName);
  const extractedText =
    sourceType === "docx"
      ? await extractDocxText(fileBuffer)
      : await extractPdfText(fileBuffer);

  if (!extractedText) {
    throw new Error("Impossible d'extraire le texte du modele source.");
  }

  const sdk = getClient();
  let parsed: Record<string, unknown> | null = null;

  if (sdk) {
    const prompt = collectionTemplatePrompt({
      sourceFileName: fileName,
      sourceType,
      extractedText,
      targetVolumeTopic,
      format
    });

    const response = await sdk.chat.completions.create({
      model: AI_MODEL_NAME,
      temperature: 0.55,
      max_completion_tokens: 9000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un architecte de collection KDP. Retourne un JSON valide, directement exploitable."
        },
        { role: "user", content: prompt }
      ]
    });

    parsed = safeJsonParse(response.choices[0]?.message?.content ?? null);
  }

  const seed = createProject({
    title: targetVolumeTopic || fileName.replace(/\.(pdf|docx)$/i, ""),
    language: "Francais",
    niche: "Collection KDP deduite depuis un livre modele",
    audience: "Lecteurs du meme type de collection",
    format,
    type: "guide pratique",
    tone: "pedagogique",
    businessGoal: "Continuer une collection a partir d'un modele deja publie",
    depth: "standard"
  });

  const merged = normalizeProject({
    ...seed,
    ...(parsed ?? {}),
    collectionTemplate: normalizeCollectionTemplate(
      fileName,
      sourceType,
      extractedText,
      parsed?.collectionTemplate,
      targetVolumeTopic
    )
  }) as BookProject;

  if (!merged.frontMatter.collectionName && merged.collectionTemplate?.collectionName) {
    merged.frontMatter.collectionName = merged.collectionTemplate.collectionName;
  }

  if (!merged.collectionTemplate) {
    merged.collectionTemplate = normalizeCollectionTemplate(
      fileName,
      sourceType,
      extractedText,
      null,
      targetVolumeTopic
    );
  }

  return {
    project: merged,
    extractedPreview: extractedText.slice(0, 2000)
  };
}

export async function importTranslationProject({
  fileName,
  fileBuffer,
  targetLanguage
}: {
  fileName: string;
  fileBuffer: Buffer;
  targetLanguage: TranslationLanguage;
}) {
  const sourceType = inferSourceType(fileName);
  const extractedText =
    sourceType === "docx"
      ? await extractDocxText(fileBuffer)
      : await extractPdfText(fileBuffer);

  if (!extractedText) {
    throw new Error("Impossible d'extraire le texte du livre source.");
  }

  const sourceSegments = segmentSourceChapters(extractedText);
  const suggestedFormat = inferFormatFromWordCount(countWords(extractedText));
  const sdk = getClient();
  let parsed: Record<string, unknown> | null = null;

  if (sdk) {
    const prompt = translationProjectPrompt({
      sourceFileName: fileName,
      sourceType,
      extractedText,
      targetLanguage,
      suggestedFormat,
      detectedChapterCount: sourceSegments.length
    });

    const response = await sdk.chat.completions.create({
      model: AI_MODEL_NAME,
      temperature: 0.45,
      max_completion_tokens: 9000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un directeur editorial et traducteur senior. Retourne un JSON valide et directement exploitable."
        },
        { role: "user", content: prompt }
      ]
    });

    parsed = safeJsonParse(response.choices[0]?.message?.content ?? null);
  }

  const seed = createProject({
    title: fileName.replace(/\.(pdf|docx)$/i, ""),
    language: targetLanguage,
    niche: "Livre traduit",
    audience: "Lecteurs de la langue cible",
    format: suggestedFormat,
    type: "guide pratique",
    tone: "pedagogique",
    businessGoal: `Traduire professionnellement un livre existant en ${targetLanguage}`,
    depth: "standard"
  });

  const normalizedBase = normalizeProject({
    ...seed,
    ...(parsed ?? {}),
    translationSource: normalizeTranslationSource(
      fileName,
      sourceType,
      extractedText,
      targetLanguage,
      parsed?.translationSource
    )
  }) as BookProject;

  normalizedBase.chapters = mergeTranslationChapters(
    normalizedBase,
    parsed?.chapters,
    sourceSegments
  );
  normalizedBase.tableOfContents =
    asString(parsed?.tableOfContents) ||
    normalizedBase.chapters.map((chapter) => chapter.title).join("\n");

  return {
    project: normalizedBase,
    extractedPreview: extractedText.slice(0, 2000)
  };
}
