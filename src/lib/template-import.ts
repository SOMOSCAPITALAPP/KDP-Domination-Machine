import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { AI_MODEL_NAME } from "@/lib/constants";
import { collectionTemplatePrompt } from "@/lib/prompts/collection-template";
import { createProject, normalizeProject } from "@/lib/storage";
import type { BookProject, CollectionTemplate } from "@/lib/types";

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
  fallbackCollectionName: string,
  fallbackTargetTopic: string
): CollectionTemplate {
  const current = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

  return {
    sourceFileName: fileName,
    sourceTitle: asString(current.sourceTitle) || fileName.replace(/\.(pdf|docx)$/i, ""),
    sourceType,
    collectionName: asString(current.collectionName) || fallbackCollectionName,
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

export async function importCollectionTemplate({
  fileName,
  fileBuffer,
  collectionName,
  targetVolumeTopic
}: {
  fileName: string;
  fileBuffer: Buffer;
  collectionName: string;
  targetVolumeTopic: string;
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
      collectionName,
      targetVolumeTopic
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
    title: targetVolumeTopic
      ? `${collectionName || "Collection"} - ${targetVolumeTopic}`
      : fileName.replace(/\.(pdf|docx)$/i, ""),
    language: "Francais",
    niche: collectionName || "Collection KDP",
    audience: "Lecteurs de la collection",
    format: "100 pages",
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
      collectionName,
      targetVolumeTopic
    )
  }) as BookProject;

  if (!merged.frontMatter.collectionName && collectionName) {
    merged.frontMatter.collectionName = collectionName;
  }

  if (!merged.collectionTemplate) {
    merged.collectionTemplate = normalizeCollectionTemplate(
      fileName,
      sourceType,
      extractedText,
      null,
      collectionName,
      targetVolumeTopic
    );
  }

  return {
    project: merged,
    extractedPreview: extractedText.slice(0, 2000)
  };
}
