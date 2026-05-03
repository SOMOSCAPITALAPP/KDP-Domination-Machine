import type { BookProject, Chapter } from "@/lib/types";

export type ManuscriptBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const BOILERPLATE_PATTERNS = [
  /^resume\s*:/i,
  /^objectif pedagogique\s*:/i,
  /^conclusion locale\b/i,
  /^ce passage developpe un angle concret/i,
  /^explique le principe, montre pourquoi il compte maintenant/i,
  /^la version va plus loin/i,
  /^la version reste dense/i,
  /^la formulation reste plus simple/i,
  /^le lecteur repart avec/i
];

function normalizeText(text: string) {
  return text.replace(/\r\n?/g, "\n").trim();
}

function isBoilerplate(text: string) {
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function cleanHeading(text: string) {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^chapitre\s+\d+\s*[:.-]?\s*/i, "")
    .replace(/^\d+(\.\d+)*\.?\s*/, "")
    .trim();
}

function normalizeComparableTitle(text: string) {
  return cleanHeading(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function splitInlineBulletParagraph(text: string) {
  if (!text.includes(" - ")) return null;

  const items = text
    .split(/\s+-\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length >= 2 ? items : null;
}

export function extractChapterBlocks(chapter: Chapter): ManuscriptBlock[] {
  const rawParagraphs = normalizeText(chapter.content)
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const blocks: ManuscriptBlock[] = [];
  const chapterTitleComparable = normalizeComparableTitle(chapter.title);

  for (const paragraph of rawParagraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (trimmed === chapter.title.trim()) continue;
    if (normalizeComparableTitle(trimmed) === chapterTitleComparable) continue;
    if (isBoilerplate(trimmed)) continue;
    if (/^#{2,3}\s*section\s+\d+/i.test(trimmed)) continue;

    if (/^#{1,6}\s+/i.test(trimmed)) {
      const heading = cleanHeading(trimmed);
      if (heading && !isBoilerplate(heading)) {
        blocks.push({ type: "heading", text: heading });
      }
      continue;
    }

    if (/^(introduction|conclusion)$/i.test(trimmed)) {
      blocks.push({ type: "heading", text: trimmed });
      continue;
    }

    if (/^\d+(\.\d+)*\.?\s+\S+/.test(trimmed)) {
      blocks.push({ type: "heading", text: cleanHeading(trimmed) });
      continue;
    }

    const inlineBullets = splitInlineBulletParagraph(trimmed);
    if (inlineBullets) {
      blocks.push({ type: "list", items: inlineBullets });
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((line) => line.replace(/^-\s+/, "").trim())
        .filter(Boolean);

      if (items.length > 0) {
        blocks.push({ type: "list", items });
        continue;
      }
    }

    blocks.push({ type: "paragraph", text: trimmed });
  }

  return blocks;
}

export function buildCleanChapterText(chapter: Chapter) {
  return extractChapterBlocks(chapter)
    .map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n")
    .trim();
}

export function buildCleanManuscript(project: BookProject) {
  return project.chapters.map((chapter) => ({
    chapter,
    blocks: extractChapterBlocks(chapter),
    cleanText: buildCleanChapterText(chapter)
  }));
}

export function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    bytes: Uint8Array.from(Buffer.from(match[2], "base64"))
  };
}
