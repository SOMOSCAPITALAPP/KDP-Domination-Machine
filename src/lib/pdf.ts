import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { BOOK_LAYOUT, buildLayoutAppendixLines, computeBookLayoutPlan } from "@/lib/book-layout";
import { buildCleanManuscript, parseImageDataUrl } from "@/lib/manuscript";
import { sanitizeForPdfText } from "@/lib/pdf-text";
import type { BookProject } from "@/lib/types";
import { getTrimSizeDimensions } from "@/lib/utils";

const POINTS_PER_INCH = 72;
const BLACK = rgb(0, 0, 0);
const FOOTER_COLOR = rgb(0.2, 0.2, 0.2);

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

function drawJustifiedLine(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  line: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  justify: boolean
) {
  const safeLine = sanitizeForPdfText(line, font);
  const parts = safeLine.split(/\s+/).filter(Boolean);

  if (!justify || parts.length < 6 || !safeLine.includes(" ")) {
    page.drawText(safeLine, {
      x,
      y,
      font,
      size,
      color: BLACK
    });
    return;
  }
  const wordWidth = parts.reduce((sum, part) => sum + font.widthOfTextAtSize(part, size), 0);
  const spaceCount = parts.length - 1;

  if (spaceCount <= 0) {
    page.drawText(safeLine, { x, y, font, size, color: BLACK });
    return;
  }

  const extraSpace = Math.max(0, maxWidth - wordWidth);
  const baseSpaceWidth = font.widthOfTextAtSize(" ", size);
  const wordSpacing = extraSpace / spaceCount;

  if (wordSpacing > baseSpaceWidth * 2.4) {
    page.drawText(safeLine, {
      x,
      y,
      font,
      size,
      color: BLACK
    });
    return;
  }

  let cursorX = x;
  parts.forEach((part, index) => {
    page.drawText(part, {
      x: cursorX,
      y,
      font,
      size,
      color: BLACK
    });

    cursorX += font.widthOfTextAtSize(part, size);
    if (index < parts.length - 1) {
      cursorX += wordSpacing;
    }
  });
}

export async function buildProjectPdf(project: BookProject) {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italicFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const { widthIn, heightIn } = getTrimSizeDimensions(
    project.paperback.trimSize,
    project.paperback.bleed
  );
  const layout = await computeBookLayoutPlan(project);
  const manuscript = buildCleanManuscript(project);
  const appendixLines = buildLayoutAppendixLines();
  const pageWidth = toPoints(widthIn);
  const pageHeight = toPoints(heightIn);
  const topMargin = toPoints(layout.topMarginIn);
  const bottomMargin = toPoints(layout.bottomMarginIn);
  const insideMargin = toPoints(layout.insideMarginIn);
  const outsideMargin = toPoints(layout.outsideMarginIn);

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

  function writeParagraph(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    gapAfter: number,
    justify = true
  ) {
    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;
    const safeText = sanitizeForPdfText(text, font);
    const lines = wrapText(safeText, maxWidth, size, (value, currentSize) =>
      font.widthOfTextAtSize(value, currentSize)
    );

    lines.forEach((line, index) => {
      ensureSpace(lineHeight);
      drawJustifiedLine(
        page,
        font,
        line,
        left,
        cursorY,
        size,
        maxWidth,
        justify && index < lines.length - 1
      );
      cursorY -= lineHeight;
    });

    cursorY -= gapAfter;
  }

  function writeHeading(text: string, size: number, gapAfter = 8) {
    cursorY -= 4;
    writeParagraph(text, titleFont, size, size + 3, gapAfter, false);
  }

  function writeCenteredText(text: string, font: PDFFont, size: number, y: number) {
    const safeText = sanitizeForPdfText(text, font);
    const width = font.widthOfTextAtSize(safeText, size);
    page.drawText(safeText, {
      x: (pageWidth - width) / 2,
      y,
      font,
      size,
      color: BLACK
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
    const scaled = image.scaleToFit(maxWidth, BOOK_LAYOUT.imageHeight);

    ensureSpace(scaled.height + 18);
    page.drawImage(image, {
      x: left + (maxWidth - scaled.width) / 2,
      y: cursorY - scaled.height,
      width: scaled.width,
      height: scaled.height
    });
    cursorY -= scaled.height + 14;
  }

  function drawFooter() {
    if (!project.paperback.pageNumbers || pageNumber <= 1) return;
    const label = String(pageNumber);
    const textWidth = bodyFont.widthOfTextAtSize(label, 10);
    page.drawText(label, {
      x: (pageWidth - textWidth) / 2,
      y: toPoints(0.42),
      font: bodyFont,
      size: 10,
      color: FOOTER_COLOR
    });
  }

  function nextPage() {
    drawFooter();
    page = addPage();
    cursorY = pageHeight - topMargin;
  }

  function writeTocLine(title: string, pageRef: number) {
    const { left, right } = getPageMargins(pageNumber);
    const maxWidth = pageWidth - left - right;
    const pageLabel = String(pageRef);
    const pageWidthValue = bodyFont.widthOfTextAtSize(pageLabel, BOOK_LAYOUT.tocFontSize);
    const availableTitleWidth = maxWidth - pageWidthValue - 24;
    const titleLines = wrapText(title, availableTitleWidth, BOOK_LAYOUT.tocFontSize, (value, size) =>
      bodyFont.widthOfTextAtSize(value, size)
    );

    titleLines.forEach((line, index) => {
      ensureSpace(BOOK_LAYOUT.tocLineHeight);

      if (index < titleLines.length - 1) {
        page.drawText(sanitizeForPdfText(line, bodyFont), {
          x: left,
          y: cursorY,
          font: bodyFont,
          size: BOOK_LAYOUT.tocFontSize,
          color: BLACK
        });
        cursorY -= BOOK_LAYOUT.tocLineHeight;
        return;
      }

      const safeLine = sanitizeForPdfText(line, bodyFont);
      const lineWidth = bodyFont.widthOfTextAtSize(safeLine, BOOK_LAYOUT.tocFontSize);
      const dotsWidth = Math.max(18, maxWidth - lineWidth - pageWidthValue - 12);
      const dotChar = ".";
      const dotWidth = bodyFont.widthOfTextAtSize(dotChar, BOOK_LAYOUT.tocFontSize);
      const dotCount = Math.max(3, Math.floor(dotsWidth / Math.max(dotWidth, 1)));
      const dots = dotChar.repeat(dotCount);
      const dotsX = left + lineWidth + 6;

      page.drawText(safeLine, {
        x: left,
        y: cursorY,
        font: bodyFont,
        size: BOOK_LAYOUT.tocFontSize,
        color: BLACK
      });
      page.drawText(dots, {
        x: dotsX,
        y: cursorY,
        font: bodyFont,
        size: BOOK_LAYOUT.tocFontSize,
        color: BLACK
      });
      page.drawText(pageLabel, {
        x: left + maxWidth - pageWidthValue,
        y: cursorY,
        font: bodyFont,
        size: BOOK_LAYOUT.tocFontSize,
        color: BLACK
      });
      cursorY -= BOOK_LAYOUT.tocLineHeight;
    });

    cursorY -= BOOK_LAYOUT.tocGap;
  }

  writeCenteredText(project.title, titleFont, BOOK_LAYOUT.titleSize, pageHeight - toPoints(2.15));
  if (project.packaging.seoSubtitle || project.promise) {
    writeCenteredText(
      project.packaging.seoSubtitle || project.promise,
      italicFont,
      BOOK_LAYOUT.subtitleSize,
      pageHeight - toPoints(2.8)
    );
  }
  if (project.frontMatter.authorName) {
    writeCenteredText(
      project.frontMatter.authorName,
      bodyFont,
      BOOK_LAYOUT.authorSize,
      pageHeight - toPoints(3.35)
    );
  }
  drawFooter();
  nextPage();

  writeHeading("Informations editoriales", 15, 6);
  if (project.frontMatter.publisherName) {
    writeParagraph(
      `Maison d'edition: ${project.frontMatter.publisherName}`,
      bodyFont,
      BOOK_LAYOUT.infoFontSize,
      BOOK_LAYOUT.infoLineHeight,
      4,
      false
    );
  }
  if (project.frontMatter.collectionName) {
    writeParagraph(
      `Collection: ${project.frontMatter.collectionName}`,
      bodyFont,
      BOOK_LAYOUT.infoFontSize,
      BOOK_LAYOUT.infoLineHeight,
      4,
      false
    );
  }
  if (project.frontMatter.isbn) {
    writeParagraph(
      `ISBN: ${project.frontMatter.isbn}`,
      bodyFont,
      BOOK_LAYOUT.infoFontSize,
      BOOK_LAYOUT.infoLineHeight,
      4,
      false
    );
  }
  if (project.frontMatter.editionNote) {
    writeParagraph(
      project.frontMatter.editionNote,
      bodyFont,
      BOOK_LAYOUT.infoFontSize,
      BOOK_LAYOUT.infoLineHeight,
      4
    );
  }
  if (project.frontMatter.copyrightNotice) {
    writeParagraph(
      project.frontMatter.copyrightNotice,
      bodyFont,
      BOOK_LAYOUT.infoFontSize,
      BOOK_LAYOUT.infoLineHeight,
      4
    );
  }

  if (project.frontMatter.dedication) {
    nextPage();
    writeHeading("Dedicace", 16, 8);
    splitParagraphs(project.frontMatter.dedication).forEach((paragraph) => {
      writeParagraph(
        paragraph,
        italicFont,
        BOOK_LAYOUT.bodyFontSize,
        BOOK_LAYOUT.bodyLineHeight,
        BOOK_LAYOUT.paragraphGap
      );
    });
  }

  if (project.frontMatter.preface) {
    nextPage();
    writeHeading("Preface", 17, 8);
    splitParagraphs(project.frontMatter.preface).forEach((paragraph) => {
      writeParagraph(
        paragraph,
        bodyFont,
        BOOK_LAYOUT.bodyFontSize,
        BOOK_LAYOUT.bodyLineHeight,
        BOOK_LAYOUT.paragraphGap
      );
    });
  }

  if (project.frontMatter.introduction) {
    nextPage();
    writeHeading("Introduction", 17, 8);
    splitParagraphs(project.frontMatter.introduction).forEach((paragraph) => {
      writeParagraph(
        paragraph,
        bodyFont,
        BOOK_LAYOUT.bodyFontSize,
        BOOK_LAYOUT.bodyLineHeight,
        BOOK_LAYOUT.paragraphGap
      );
    });
  }

  nextPage();
  writeHeading("Table des matieres", 17, 6);
  layout.tocEntries.forEach((entry) => writeTocLine(entry.title, entry.page));

  for (const entry of manuscript) {
    nextPage();
    writeHeading(entry.chapter.title, BOOK_LAYOUT.chapterTitleSize, 10);

    if (entry.chapter.selectedIllustrationDataUrl) {
      await drawChapterImage(entry.chapter.selectedIllustrationDataUrl);
    }

    if (entry.blocks.length === 0) {
      writeParagraph(
        "Chapitre a completer.",
        italicFont,
        BOOK_LAYOUT.bodyFontSize,
        BOOK_LAYOUT.bodyLineHeight,
        BOOK_LAYOUT.paragraphGap
      );
      continue;
    }

    for (const block of entry.blocks) {
      if (block.type === "heading") {
        writeHeading(block.text, BOOK_LAYOUT.sectionTitleSize, 5);
        continue;
      }

      if (block.type === "list") {
        block.items.forEach((item) => {
          writeParagraph(
            `- ${item}`,
            bodyFont,
            BOOK_LAYOUT.bodyFontSize,
            BOOK_LAYOUT.bodyLineHeight,
            4
          );
        });
        cursorY -= 2;
        continue;
      }

      writeParagraph(
        block.text,
        bodyFont,
        BOOK_LAYOUT.bodyFontSize,
        BOOK_LAYOUT.bodyLineHeight,
        BOOK_LAYOUT.paragraphGap
      );
    }
  }

  nextPage();
  writeHeading("Annexe - Donnees de mise en page", BOOK_LAYOUT.annexTitleSize, 8);
  appendixLines.slice(1).forEach((line) => {
    if (!line.trim()) {
      cursorY -= 6;
      return;
    }
    writeParagraph(
      line,
      bodyFont,
      BOOK_LAYOUT.annexBodySize,
      13.5,
      4,
      true
    );
  });

  drawFooter();

  return {
    bytes: await pdfDoc.save(),
    meta: {
      pageCount: layout.pageCount,
      trimSize: layout.trimSize,
      bleed: layout.bleed,
      insideMarginIn: layout.insideMarginIn,
      outsideMarginIn: layout.outsideMarginIn,
      topMarginIn: layout.topMarginIn,
      bottomMarginIn: layout.bottomMarginIn,
      estimatedWords: layout.estimatedWords,
      model: "gpt-4.1-mini"
    }
  };
}
