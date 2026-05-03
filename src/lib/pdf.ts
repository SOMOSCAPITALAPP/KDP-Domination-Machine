import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BookProject } from "@/lib/types";
import { getKdpMarginPreset, getPdfPreviewMeta, getTrimSizeDimensions } from "@/lib/utils";

const POINTS_PER_INCH = 72;

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

export async function buildProjectPdf(project: BookProject) {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const { widthIn, heightIn } = getTrimSizeDimensions(
    project.paperback.trimSize,
    project.paperback.bleed
  );
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
      ensureSpace(lineHeight);
      page.drawText(line, {
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
    gapAfter = 8
  ) {
    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;
    const lines = wrapText(text, maxWidth, size, (value, currentSize) =>
      font.widthOfTextAtSize(value, currentSize)
    );
    writeLines(lines, font, size, lineHeight);
    cursorY -= gapAfter;
  }

  function writeHeading(text: string, size: number) {
    cursorY -= 6;
    writeParagraph(text, titleFont, size, size + 4, 10);
  }

  function writeCenteredText(text: string, font: typeof bodyFont, size: number, y: number) {
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - width) / 2,
      y,
      font,
      size,
      color: rgb(0.12, 0.16, 0.22)
    });
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

  writeCenteredText(project.title, titleFont, 22, pageHeight - toPoints(2));
  if (project.packaging.seoSubtitle || project.promise) {
    writeCenteredText(
      project.packaging.seoSubtitle || project.promise,
      italicFont,
      13,
      pageHeight - toPoints(2.55)
    );
  }
  if (project.frontMatter.authorName) {
    writeCenteredText(project.frontMatter.authorName, bodyFont, 12, pageHeight - toPoints(3.15));
  }
  if (project.frontMatter.collectionName) {
    writeCenteredText(project.frontMatter.collectionName, italicFont, 11, pageHeight - toPoints(3.55));
  }
  drawFooter();
  nextPage();

  writeHeading("Informations editoriales", 16);
  if (project.frontMatter.publisherName) {
    writeParagraph(`Maison d'edition: ${project.frontMatter.publisherName}`, bodyFont, 11, 16, 6);
  }
  if (project.frontMatter.collectionName) {
    writeParagraph(`Collection: ${project.frontMatter.collectionName}`, bodyFont, 11, 16, 6);
  }
  if (project.frontMatter.isbn) {
    writeParagraph(`ISBN: ${project.frontMatter.isbn}`, bodyFont, 11, 16, 6);
  }
  if (project.frontMatter.editionNote) {
    writeParagraph(project.frontMatter.editionNote, bodyFont, 11, 16, 6);
  }
  if (project.frontMatter.copyrightNotice) {
    writeParagraph(project.frontMatter.copyrightNotice, bodyFont, 11, 16, 6);
  }

  if (project.frontMatter.dedication) {
    nextPage();
    writeHeading("Dedicace", 16);
    writeParagraph(project.frontMatter.dedication, italicFont, 12, 18, 12);
  }

  if (project.frontMatter.preface) {
    nextPage();
    writeHeading("Preface", 18);
    for (const paragraph of splitParagraphs(project.frontMatter.preface)) {
      writeParagraph(paragraph, bodyFont, 11, 17, 10);
    }
  }

  if (project.frontMatter.introduction) {
    nextPage();
    writeHeading("Introduction", 18);
    for (const paragraph of splitParagraphs(project.frontMatter.introduction)) {
      writeParagraph(paragraph, bodyFont, 11, 17, 10);
    }
  }

  nextPage();
  writeHeading("Table des matieres", 18);
  const tocLines = project.tableOfContents
    ? project.tableOfContents.split("\n").map((item) => item.trim()).filter(Boolean)
    : project.chapters.map((chapter) => chapter.title);
  for (const line of tocLines) {
    writeParagraph(line, bodyFont, 12, 17, 4);
  }

  for (const chapter of project.chapters) {
    nextPage();
    writeHeading(chapter.title, 18);

    const contentParagraphs = splitParagraphs(chapter.content);
    if (contentParagraphs.length === 0) {
      writeParagraph("Chapitre a completer.", italicFont, 11, 16, 12);
      continue;
    }

    for (const paragraph of contentParagraphs) {
      if (paragraph.startsWith("### ")) {
        writeHeading(paragraph.replace(/^###\s*/, ""), 14);
        continue;
      }

      const prefix = paragraph.startsWith("## ") ? paragraph.replace(/^##\s*/, "") : "";
      if (prefix) {
        writeHeading(prefix, 15);
        continue;
      }

      writeParagraph(paragraph, bodyFont, 11, 17, 10);
    }
  }

  drawFooter();
  return {
    bytes: await pdfDoc.save(),
    meta
  };
}
