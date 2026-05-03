import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCleanManuscript } from "@/lib/manuscript";
import type { BookProject } from "@/lib/types";
import { estimatePaperbackPageCount, getKdpMarginPreset, getTrimSizeDimensions } from "@/lib/utils";

const POINTS_PER_INCH = 72;

export const BOOK_LAYOUT = {
  titleSize: 24,
  subtitleSize: 13,
  chapterTitleSize: 18,
  sectionTitleSize: 15,
  bodyFontSize: 11.5,
  bodyLineHeight: 17,
  paragraphGap: 7,
  headingGap: 10,
  tocFontSize: 11,
  tocLineHeight: 14,
  tocGap: 2,
  infoFontSize: 11,
  infoLineHeight: 15,
  imageHeight: 220
} as const;

export type TocEntry = {
  title: string;
  page: number;
};

export type BookLayoutPlan = {
  pageCount: number;
  trimSize: BookProject["paperback"]["trimSize"];
  bleed: boolean;
  insideMarginIn: number;
  outsideMarginIn: number;
  topMarginIn: number;
  bottomMarginIn: number;
  estimatedWords: number;
  chapterStartPages: Record<string, number>;
  tocEntries: TocEntry[];
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
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

export async function computeBookLayoutPlan(project: BookProject): Promise<BookLayoutPlan> {
  const probePdf = await PDFDocument.create();
  const titleFont = await probePdf.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await probePdf.embedFont(StandardFonts.TimesRoman);
  const italicFont = await probePdf.embedFont(StandardFonts.TimesRomanItalic);
  const manuscript = buildCleanManuscript(project);
  const { widthIn, heightIn } = getTrimSizeDimensions(
    project.paperback.trimSize,
    project.paperback.bleed
  );
  const pageWidth = toPoints(widthIn);
  const pageHeight = toPoints(heightIn);

  let pageCountGuess = estimatePaperbackPageCount(project);
  let finalMargins = getKdpMarginPreset(pageCountGuess, project.paperback.bleed);
  let chapterStartPages: Record<string, number> = {};
  let tocEntries: TocEntry[] = [];

  for (let pass = 0; pass < 2; pass += 1) {
    finalMargins = getKdpMarginPreset(pageCountGuess, project.paperback.bleed);
    const topMargin = toPoints(finalMargins.topMarginIn);
    const bottomMargin = toPoints(finalMargins.bottomMarginIn);
    const insideMargin = toPoints(finalMargins.insideMarginIn);
    const outsideMargin = toPoints(finalMargins.outsideMarginIn);

    let pageNumber = 1;
    let cursorY = pageHeight - topMargin;
    chapterStartPages = {};
    tocEntries = [];

    function getHorizontalSpace(currentPageNumber: number) {
      const oddPage = currentPageNumber % 2 === 1;
      const left = oddPage ? insideMargin : outsideMargin;
      const right = oddPage ? outsideMargin : insideMargin;
      return {
        left,
        right,
        maxWidth: pageWidth - left - right
      };
    }

    function nextPage() {
      pageNumber += 1;
      cursorY = pageHeight - topMargin;
    }

    function ensureSpace(heightNeeded: number) {
      if (cursorY - heightNeeded >= bottomMargin) return;
      nextPage();
    }

    function consumeParagraph(
      text: string,
      font: typeof bodyFont,
      size: number,
      lineHeight: number,
      gapAfter: number
    ) {
      const { maxWidth } = getHorizontalSpace(pageNumber);
      const lines = wrapText(text, maxWidth, size, (value, currentSize) =>
        font.widthOfTextAtSize(value, currentSize)
      );

      for (const line of lines) {
        ensureSpace(lineHeight);
        cursorY -= lineHeight;
      }

      cursorY -= gapAfter;
    }

    function consumeHeading(text: string, size: number, gapAfter: number = BOOK_LAYOUT.headingGap) {
      cursorY -= 6;
      consumeParagraph(text, titleFont, size, size + 4, gapAfter);
    }

    pageNumber = 1;
    cursorY = pageHeight - topMargin;

    nextPage();
    consumeHeading("Informations editoriales", 15, 8);

    if (project.frontMatter.publisherName) {
      consumeParagraph(
        `Maison d'edition: ${project.frontMatter.publisherName}`,
        bodyFont,
        BOOK_LAYOUT.infoFontSize,
        BOOK_LAYOUT.infoLineHeight,
        4
      );
    }
    if (project.frontMatter.collectionName) {
      consumeParagraph(
        `Collection: ${project.frontMatter.collectionName}`,
        bodyFont,
        BOOK_LAYOUT.infoFontSize,
        BOOK_LAYOUT.infoLineHeight,
        4
      );
    }
    if (project.frontMatter.isbn) {
      consumeParagraph(
        `ISBN: ${project.frontMatter.isbn}`,
        bodyFont,
        BOOK_LAYOUT.infoFontSize,
        BOOK_LAYOUT.infoLineHeight,
        4
      );
    }
    if (project.frontMatter.editionNote) {
      consumeParagraph(
        project.frontMatter.editionNote,
        bodyFont,
        BOOK_LAYOUT.infoFontSize,
        BOOK_LAYOUT.infoLineHeight,
        4
      );
    }
    if (project.frontMatter.copyrightNotice) {
      consumeParagraph(
        project.frontMatter.copyrightNotice,
        bodyFont,
        BOOK_LAYOUT.infoFontSize,
        BOOK_LAYOUT.infoLineHeight,
        4
      );
    }

    if (project.frontMatter.dedication) {
      nextPage();
      consumeHeading("Dedicace", 16, 10);
      splitParagraphs(project.frontMatter.dedication).forEach((paragraph) => {
        consumeParagraph(
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
      consumeHeading("Preface", 17, 10);
      splitParagraphs(project.frontMatter.preface).forEach((paragraph) => {
        consumeParagraph(
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
      consumeHeading("Introduction", 17, 10);
      splitParagraphs(project.frontMatter.introduction).forEach((paragraph) => {
        consumeParagraph(
          paragraph,
          bodyFont,
          BOOK_LAYOUT.bodyFontSize,
          BOOK_LAYOUT.bodyLineHeight,
          BOOK_LAYOUT.paragraphGap
        );
      });
    }

    nextPage();
    const tocLines = project.tableOfContents
      ? project.tableOfContents.split("\n").map((item) => item.trim()).filter(Boolean)
      : project.chapters.map((chapter) => chapter.title);
    consumeHeading("Table des matieres", 17, 8);
    tocLines.forEach((line) => {
      consumeParagraph(
        line,
        bodyFont,
        BOOK_LAYOUT.tocFontSize,
        BOOK_LAYOUT.tocLineHeight,
        BOOK_LAYOUT.tocGap
      );
    });

    for (const entry of manuscript) {
      nextPage();
      chapterStartPages[entry.chapter.id] = pageNumber;
      tocEntries.push({
        title: entry.chapter.title,
        page: pageNumber
      });

      consumeHeading(entry.chapter.title, BOOK_LAYOUT.chapterTitleSize, 12);

      if (entry.chapter.selectedIllustrationDataUrl) {
        ensureSpace(BOOK_LAYOUT.imageHeight + 20);
        cursorY -= BOOK_LAYOUT.imageHeight + 18;
      }

      if (entry.blocks.length === 0) {
        consumeParagraph(
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
          consumeHeading(block.text, BOOK_LAYOUT.sectionTitleSize, 6);
          continue;
        }

        if (block.type === "list") {
          block.items.forEach((item) => {
            consumeParagraph(
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

        consumeParagraph(
          block.text,
          bodyFont,
          BOOK_LAYOUT.bodyFontSize,
          BOOK_LAYOUT.bodyLineHeight,
          BOOK_LAYOUT.paragraphGap
        );
      }
    }
    const actualPageCount = pageNumber;
    const nextMargins = getKdpMarginPreset(actualPageCount, project.paperback.bleed);

    if (
      nextMargins.insideMarginIn === finalMargins.insideMarginIn &&
      nextMargins.outsideMarginIn === finalMargins.outsideMarginIn
    ) {
      pageCountGuess = actualPageCount;
      break;
    }

    pageCountGuess = actualPageCount;
  }

  return {
    pageCount: pageCountGuess,
    trimSize: project.paperback.trimSize,
    bleed: project.paperback.bleed,
    insideMarginIn: finalMargins.insideMarginIn,
    outsideMarginIn: finalMargins.outsideMarginIn,
    topMarginIn: finalMargins.topMarginIn,
    bottomMarginIn: finalMargins.bottomMarginIn,
    estimatedWords: manuscript.reduce((sum, entry) => sum + entry.chapter.wordCount, 0),
    chapterStartPages,
    tocEntries
  };
}
