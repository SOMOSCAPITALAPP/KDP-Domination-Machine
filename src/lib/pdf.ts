import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { buildCleanManuscript, parseImageDataUrl } from "@/lib/manuscript";
import type { BookProject } from "@/lib/types";
import { getKdpMarginPreset, getPdfPreviewMeta, getTrimSizeDimensions } from "@/lib/utils";

const POINTS_PER_INCH = 72;
const BODY_FONT_SIZE = 12.5;
const BODY_LINE_HEIGHT = 21;
const PARAGRAPH_GAP = 12;
const PDF_CHAR_REPLACEMENTS: Record<string, string> = {
  "\u00A0": " ",
  "\u2007": " ",
  "\u202F": " ",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\u2060": "",
  "\u2010": "-",
  "\u2011": "-",
  "\u2012": "-",
  "\u2013": "-",
  "\u2014": "-",
  "\u2015": "-",
  "\u2212": "-",
  "\u2026": "...",
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": ",",
  "\u201B": "'",
  "\u201C": "\"",
  "\u201D": "\"",
  "\u201E": "\"",
  "\u00AB": "\"",
  "\u00BB": "\"",
  "\u2022": "-",
  "\u00B7": "-",
  "\u2023": "-",
  "\u2043": "-",
  "\u2219": "-",
  "\u00B9": "1",
  "\u00B2": "2",
  "\u00B3": "3",
  "\u2070": "0",
  "\u2071": "i",
  "\u2074": "4",
  "\u2075": "5",
  "\u2076": "6",
  "\u2077": "7",
  "\u2078": "8",
  "\u2079": "9",
  "\u2080": "0",
  "\u2081": "1",
  "\u2082": "2",
  "\u2083": "3",
  "\u2084": "4",
  "\u2085": "5",
  "\u2086": "6",
  "\u2087": "7",
  "\u2088": "8",
  "\u2089": "9",
  "\u20AC": "EUR",
  "\u2122": "TM",
  "\u00AE": "(R)",
  "\u00A9": "(C)"
};

function toPoints(inches: number) {
  return inches * POINTS_PER_INCH;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  measure: (value: string, size: number) => number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (measure(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function sanitizeForPdfText(text: string, font: PDFFont) {
  const normalized = text.replace(/\r\n?/g, "\n");
  let output = "";

  for (const character of normalized) {
    const candidate = PDF_CHAR_REPLACEMENTS[character] ?? character;

    for (const piece of candidate) {
      try {
        font.encodeText(piece);
        output += piece;
      } catch {
        output += "?";
      }
    }
  }

  return output;
}

export async function buildProjectPdf(project: BookProject) {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const { widthIn, heightIn } = getTrimSizeDimensions(
    project.paperback.trimSize,
    project.paperback.bleed
  );
  const manuscript = buildCleanManuscript(project);
  const meta = getPdfPreviewMeta(project);
  const margins = getKdpMarginPreset(meta.pageCount, project.paperback.bleed);
  const pageWidth = toPoints(widthIn);
  const pageHeight = toPoints(heightIn);
  const topMargin = toPoints(margins.topMarginIn);
  const bottomMargin = toPoints(margins.bottomMarginIn);
  const insideMargin = toPoints(margins.insideMarginIn);
  const outsideMargin = toPoints(margins.outsideMarginIn);

  let pageNumber = 0;
  let page = addPage();
  let cursorY = pageHeight - topMargin;

  function addPage() {
    pageNumber += 1;
    return pdfDoc.addPage([pageWidth, pageHeight]);
  }

  function getPageMargins(currentPageNumber: number) {
    const oddPage = currentPageNumber % 2 === 1;
    return {
      left: oddPage ? insideMargin : outsideMargin,
      right: oddPage ? outsideMargin : insideMargin
    };
  }

  function ensureSpace(heightNeeded: number) {
    if (cursorY - heightNeeded >= bottomMargin) return;
    drawFooter();
    page = addPage();
    cursorY = pageHeight - topMargin;
  }

  function writeLines(
    lines: string[],
    font: typeof bodyFont,
    size: number,
    lineHeight: number,
    color = rgb(0.12, 0.16, 0.22)
  ) {
    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;

    for (const line of lines) {
      const safeLine = sanitizeForPdfText(line, font);
      ensureSpace(lineHeight);
      page.drawText(safeLine, {
        x: left,
        y: cursorY,
        font,
        size,
        color,
        maxWidth
      });
      cursorY -= lineHeight;
    }
  }

  function writeParagraph(
    text: string,
    font: typeof bodyFont,
    size: number,
    lineHeight: number,
    gapAfter = PARAGRAPH_GAP
  ) {
    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;
    const safeText = sanitizeForPdfText(text, font);
    const lines = wrapText(safeText, maxWidth, size, (value, currentSize) =>
      font.widthOfTextAtSize(value, currentSize)
    );
    writeLines(lines, font, size, lineHeight);
    cursorY -= gapAfter;
  }

  function writeHeading(text: string, size: number, gapAfter = 12) {
    cursorY -= 8;
    writeParagraph(text, titleFont, size, size + 5, gapAfter);
  }

  function writeCenteredText(text: string, font: typeof bodyFont, size: number, y: number) {
    const safeText = sanitizeForPdfText(text, font);
    const width = font.widthOfTextAtSize(safeText, size);
    page.drawText(safeText, {
      x: (pageWidth - width) / 2,
      y,
      font,
      size,
      color: rgb(0.12, 0.16, 0.22)
    });
  }

  async function drawChapterImage(dataUrl: string) {
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) return;

    const image =
      parsed.mimeType === "image/png"
        ? await pdfDoc.embedPng(parsed.bytes)
        : await pdfDoc.embedJpg(parsed.bytes);

    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;
    const scaled = image.scaleToFit(maxWidth, toPoints(3.6));

    ensureSpace(scaled.height + 28);
    page.drawImage(image, {
      x: left + (maxWidth - scaled.width) / 2,
      y: cursorY - scaled.height,
      width: scaled.width,
      height: scaled.height
    });
    cursorY -= scaled.height + 18;
  }

  function drawFooter() {
    if (!project.paperback.pageNumbers || pageNumber <= 1) return;
    const label = String(pageNumber);
    const textWidth = bodyFont.widthOfTextAtSize(label, 10);
    page.drawText(label, {
      x: (pageWidth - textWidth) / 2,
      y: toPoints(0.4),
      font: bodyFont,
      size: 10,
      color: rgb(0.38, 0.41, 0.47)
    });
  }

  function nextPage() {
    drawFooter();
    page = addPage();
    cursorY = pageHeight - topMargin;
  }

  writeCenteredText(project.title, titleFont, 24, pageHeight - toPoints(2.1));
  if (project.packaging.seoSubtitle || project.promise) {
    writeCenteredText(
      project.packaging.seoSubtitle || project.promise,
      italicFont,
      14,
      pageHeight - toPoints(2.7)
    );
  }
  if (project.frontMatter.authorName) {
    writeCenteredText(project.frontMatter.authorName, bodyFont, 13, pageHeight - toPoints(3.35));
  }
  drawFooter();
  nextPage();

  writeHeading("Informations editoriales", 16);
  if (project.frontMatter.publisherName) {
    writeParagraph(`Maison d'edition: ${project.frontMatter.publisherName}`, bodyFont, 11.5, 18, 8);
  }
  if (project.frontMatter.collectionName) {
    writeParagraph(`Collection: ${project.frontMatter.collectionName}`, bodyFont, 11.5, 18, 8);
  }
  if (project.frontMatter.isbn) {
    writeParagraph(`ISBN: ${project.frontMatter.isbn}`, bodyFont, 11.5, 18, 8);
  }
  if (project.frontMatter.editionNote) {
    writeParagraph(project.frontMatter.editionNote, bodyFont, 11.5, 18, 8);
  }
  if (project.frontMatter.copyrightNotice) {
    writeParagraph(project.frontMatter.copyrightNotice, bodyFont, 11.5, 18, 8);
  }

  if (project.frontMatter.dedication) {
    nextPage();
    writeHeading("Dedicace", 16);
    writeParagraph(project.frontMatter.dedication, italicFont, 12.5, 20, 14);
  }

  if (project.frontMatter.preface) {
    nextPage();
    writeHeading("Preface", 18);
    for (const paragraph of splitParagraphs(project.frontMatter.preface)) {
      writeParagraph(paragraph, bodyFont, BODY_FONT_SIZE, BODY_LINE_HEIGHT, PARAGRAPH_GAP);
    }
  }

  if (project.frontMatter.introduction) {
    nextPage();
    writeHeading("Introduction", 18);
    for (const paragraph of splitParagraphs(project.frontMatter.introduction)) {
      writeParagraph(paragraph, bodyFont, BODY_FONT_SIZE, BODY_LINE_HEIGHT, PARAGRAPH_GAP);
    }
  }

  nextPage();
  writeHeading("Table des matieres", 18);
  const tocLines = project.tableOfContents
    ? project.tableOfContents.split("\n").map((item) => item.trim()).filter(Boolean)
    : project.chapters.map((chapter) => chapter.title);
  for (const line of tocLines) {
    writeParagraph(line, bodyFont, 12.5, 18, 6);
  }

  for (const entry of manuscript) {
    nextPage();
    writeHeading(entry.chapter.title, 20, 16);

    if (entry.chapter.selectedIllustrationDataUrl) {
      await drawChapterImage(entry.chapter.selectedIllustrationDataUrl);
    }

    if (entry.blocks.length === 0) {
      writeParagraph("Chapitre a completer.", italicFont, 12, 18, 12);
      continue;
    }

    for (const block of entry.blocks) {
      if (block.type === "heading") {
        writeHeading(block.text, 15, 8);
        continue;
      }

      if (block.type === "list") {
        for (const item of block.items) {
          writeParagraph(`- ${item}`, bodyFont, BODY_FONT_SIZE, BODY_LINE_HEIGHT, 6);
        }
        cursorY -= 4;
        continue;
      }

      writeParagraph(block.text, bodyFont, BODY_FONT_SIZE, BODY_LINE_HEIGHT, PARAGRAPH_GAP);
    }
  }

  drawFooter();
  return {
    bytes: await pdfDoc.save(),
    meta
  };
}
