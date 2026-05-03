import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { AI_MODEL_NAME } from "@/lib/constants";
import type { BookProject } from "@/lib/types";
import {
  countWords,
  getKdpMarginPreset,
  getPdfPreviewMeta,
  getTrimSizeDimensions
} from "@/lib/utils";

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

function wrapText(text: string, maxWidth: number, fontSize: number, measure: (value: string, size: number) => number) {
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
    const nextPage = pdfDoc.addPage([pageWidth, pageHeight]);
    return nextPage;
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
    page = addPage();
    cursorY = pageHeight - topMargin;
  }

  function writeLines(lines: string[], font: typeof bodyFont, size: number, lineHeight: number, color = rgb(0.12, 0.16, 0.22)) {
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

  function writeParagraph(text: string, font: typeof bodyFont, size: number, lineHeight: number, gapAfter = 8) {
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

  const centeredTitleSize = 22;
  const centeredSubSize = 13;
  const titleWidth = titleFont.widthOfTextAtSize(project.title, centeredTitleSize);
  page.drawText(project.title, {
    x: (pageWidth - titleWidth) / 2,
    y: pageHeight - toPoints(2),
    font: titleFont,
    size: centeredTitleSize,
    color: rgb(0.1, 0.13, 0.2)
  });

  const subtitle = project.packaging.seoSubtitle || project.promise || "Manuscrit interieur KDP";
  const subtitleWidth = italicFont.widthOfTextAtSize(subtitle, centeredSubSize);
  page.drawText(subtitle, {
    x: (pageWidth - subtitleWidth) / 2,
    y: pageHeight - toPoints(2.55),
    font: italicFont,
    size: centeredSubSize,
    color: rgb(0.36, 0.38, 0.45)
  });

  page.drawText(`Modele IA: ${AI_MODEL_NAME}`, {
    x: getPageMargins(pageNumber).left,
    y: toPoints(0.9),
    font: bodyFont,
    size: 10,
    color: rgb(0.42, 0.44, 0.5)
  });
  drawFooter();
  nextPage();

  writeHeading("Table des matieres", 18);
  const tocLines = project.tableOfContents
    ? project.tableOfContents.split("\n").map((item) => item.trim()).filter(Boolean)
    : project.chapters.map((chapter) => chapter.title);
  for (const line of tocLines) {
    writeParagraph(line, bodyFont, 12, 17, 4);
  }
  nextPage();

  for (const chapter of project.chapters) {
    writeHeading(chapter.title, 18);
    if (chapter.summary) {
      writeParagraph(`Resume: ${chapter.summary}`, italicFont, 11, 16, 8);
    }
    if (chapter.learningGoal) {
      writeParagraph(`Objectif: ${chapter.learningGoal}`, bodyFont, 11, 16, 8);
    }

    const contentParagraphs = splitParagraphs(chapter.content);
    if (contentParagraphs.length === 0) {
      writeParagraph(
        `Chapitre a completer. Cible actuelle: ${chapter.targetWords} mots.`,
        italicFont,
        11,
        16,
        12
      );
    } else {
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

    writeParagraph(
      `Compteur chapitre: ${chapter.wordCount || countWords(chapter.content)} mots / objectif ${chapter.targetWords} mots.`,
      italicFont,
      10,
      15,
      18
    );

    drawFooter();
    if (chapter !== project.chapters[project.chapters.length - 1]) {
      nextPage();
    }
  }

  drawFooter();
  return {
    bytes: await pdfDoc.save(),
    meta
  };
}
