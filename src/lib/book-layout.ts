import { PDFDocument, StandardFonts } from "pdf-lib";
import { buildCleanManuscript } from "@/lib/manuscript";
import { sanitizeForPdfText } from "@/lib/pdf-text";
import type { BookProject } from "@/lib/types";
import { getTrimSizeDimensions } from "@/lib/utils";

const POINTS_PER_INCH = 72;
const CM_TO_IN = 0.3937007874;

export const MASTER_PAGE_SETUP_CM = {
  top: 1.25,
  bottom: 1.28,
  left: 0.7,
  right: 0.9,
  gutter: 0.4
} as const;

export const BOOK_LAYOUT = {
  titleSize: 28,
  subtitleSize: 24,
  authorSize: 20,
  chapterTitleSize: 17,
  sectionTitleSize: 13.5,
  bodyFontSize: 11,
  bodyLineHeight: 15.5,
  paragraphGap: 5,
  headingGap: 8,
  tocFontSize: 10.5,
  tocLineHeight: 12.5,
  tocGap: 2,
  infoFontSize: 10.5,
  infoLineHeight: 13.5,
  imageHeight: 220,
  annexTitleSize: 16,
  annexBodySize: 10.5
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

export function cmToInches(value: number) {
  return value * CM_TO_IN;
}

export function getMasterMarginInches() {
  return {
    topMarginIn: cmToInches(MASTER_PAGE_SETUP_CM.top),
    bottomMarginIn: cmToInches(MASTER_PAGE_SETUP_CM.bottom),
    insideMarginIn: cmToInches(MASTER_PAGE_SETUP_CM.left + MASTER_PAGE_SETUP_CM.gutter),
    outsideMarginIn: cmToInches(MASTER_PAGE_SETUP_CM.right),
    gutterIn: cmToInches(MASTER_PAGE_SETUP_CM.gutter)
  };
}

export function buildLayoutAppendixLines() {
  return [
    "Annexe - Donnees de mise en page",
    "",
    "Modele applique systematiquement aux exports Word et PDF.",
    `Marges hautes: ${MASTER_PAGE_SETUP_CM.top} cm`,
    `Marges basses: ${MASTER_PAGE_SETUP_CM.bottom} cm`,
    `Marge gauche: ${MASTER_PAGE_SETUP_CM.left} cm`,
    `Marge droite: ${MASTER_PAGE_SETUP_CM.right} cm`,
    `Reliure: ${MASTER_PAGE_SETUP_CM.gutter} cm, position a gauche`,
    "Corps de texte harmonise en style livre broche, paragraphes justifies, noir uniforme et hierarchie stable des titres."
  ];
}

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
  const appendixLines = buildLayoutAppendixLines();
  const { widthIn, heightIn } = getTrimSizeDimensions(
    project.paperback.trimSize,
    project.paperback.bleed
  );
  const pageWidth = toPoints(widthIn);
  const pageHeight = toPoints(heightIn);

  let pageCountGuess = Math.max(24, manuscript.length + 6);
  let finalMargins = getMasterMarginInches();
  let chapterStartPages: Record<string, number> = {};
  let tocEntries: TocEntry[] = [];

  for (let pass = 0; pass < 2; pass += 1) {
    finalMargins = getMasterMarginInches();
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
      const safeText = sanitizeForPdfText(text, font);
      const lines = wrapText(safeText, maxWidth, size, (value, currentSize) =>
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

    nextPage();
    consumeHeading("Annexe - Donnees de mise en page", BOOK_LAYOUT.annexTitleSize, 8);
    appendixLines.slice(1).forEach((line) => {
      if (!line.trim()) {
        cursorY -= 6;
        return;
      }
      consumeParagraph(
        line,
        bodyFont,
        BOOK_LAYOUT.annexBodySize,
        13.5,
        4
      );
    });
    pageCountGuess = pageNumber;
    break;
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
