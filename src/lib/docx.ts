import {
  AlignmentType,
  Document,
  Footer,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType
} from "docx";
import { computeBookLayoutPlan } from "@/lib/book-layout";
import { buildCleanManuscript, parseImageDataUrl } from "@/lib/manuscript";
import type { BookProject } from "@/lib/types";

const BODY_FONT = "Times New Roman";
const BLACK = "000000";

function run(text: string, size: number, bold = false, italic = false) {
  return new TextRun({
    text,
    size,
    bold,
    italics: italic,
    font: BODY_FONT,
    color: BLACK
  });
}

function titleParagraph(text: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 220 },
    children: [run(text, 34, true)]
  });
}

function centeredParagraph(text: string, size: number, italic = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 180 },
    children: [run(text, size, false, italic)]
  });
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [run(text, 28, true)]
  });
}

function chapterTitle(text: string) {
  return new Paragraph({
    spacing: { before: 200, after: 180 },
    pageBreakBefore: true,
    children: [run(text, 30, true)]
  });
}

function subHeading(text: string) {
  return new Paragraph({
    spacing: { before: 180, after: 90 },
    children: [run(text, 25, true)]
  });
}

function bodyParagraph(text: string, italic = false) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 330 },
    children: [run(text, 24, false, italic)]
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    bullet: { level: 0 },
    spacing: { after: 80, line: 320 },
    children: [run(text, 24)]
  });
}

function imageParagraph(dataUrl: string, title: string) {
  const image = parseImageDataUrl(dataUrl);
  if (!image) return null;

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 180 },
    children: [
      new ImageRun({
        data: image.bytes,
        type: image.mimeType === "image/png" ? "png" : "jpg",
        transformation: {
          width: 430,
          height: 430
        },
        altText: {
          name: title,
          title,
          description: title
        }
      })
    ]
  });
}

function tocTable(project: BookProject, entries: Array<{ title: string; page: number }>) {
  const rows = entries.map(
    (entry) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8600, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: "none", size: 0, color: "FFFFFF" },
              bottom: { style: "none", size: 0, color: "FFFFFF" },
              left: { style: "none", size: 0, color: "FFFFFF" },
              right: { style: "none", size: 0, color: "FFFFFF" }
            },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [run(entry.title, 22)]
              })
            ]
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: {
              top: { style: "none", size: 0, color: "FFFFFF" },
              bottom: { style: "none", size: 0, color: "FFFFFF" },
              left: { style: "none", size: 0, color: "FFFFFF" },
              right: { style: "none", size: 0, color: "FFFFFF" }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
                children: [run(String(entry.page), 22)]
              })
            ]
          })
        ]
      })
  );

  if (rows.length === 0) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            borders: {
              top: { style: "none", size: 0, color: "FFFFFF" },
              bottom: { style: "none", size: 0, color: "FFFFFF" },
              left: { style: "none", size: 0, color: "FFFFFF" },
              right: { style: "none", size: 0, color: "FFFFFF" }
            },
            children: [bodyParagraph(project.tableOfContents || "Sommaire a finaliser.")]
          })
        ]
      })
    );
  }

  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: "none", size: 0, color: "FFFFFF" },
      bottom: { style: "none", size: 0, color: "FFFFFF" },
      left: { style: "none", size: 0, color: "FFFFFF" },
      right: { style: "none", size: 0, color: "FFFFFF" },
      insideHorizontal: { style: "none", size: 0, color: "FFFFFF" },
      insideVertical: { style: "none", size: 0, color: "FFFFFF" }
    },
    rows
  });
}

export async function buildProjectDocx(project: BookProject) {
  const manuscript = buildCleanManuscript(project);
  const layout = await computeBookLayoutPlan(project);
  const children: Array<Paragraph | Table> = [
    titleParagraph(project.title),
    centeredParagraph(project.packaging.seoSubtitle || project.promise || "Manuscrit KDP", 24, true),
    centeredParagraph(project.frontMatter.authorName || "", 24)
  ];

  children.push(sectionTitle("Informations editoriales"));
  if (project.frontMatter.publisherName) {
    children.push(bodyParagraph(`Maison d'edition: ${project.frontMatter.publisherName}`));
  }
  if (project.frontMatter.collectionName) {
    children.push(bodyParagraph(`Collection: ${project.frontMatter.collectionName}`));
  }
  if (project.frontMatter.isbn) {
    children.push(bodyParagraph(`ISBN: ${project.frontMatter.isbn}`));
  }
  if (project.frontMatter.editionNote) {
    children.push(bodyParagraph(project.frontMatter.editionNote));
  }
  if (project.frontMatter.copyrightNotice) {
    children.push(bodyParagraph(project.frontMatter.copyrightNotice));
  }

  if (project.frontMatter.dedication.trim()) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 160 },
        children: [run("Dedicace", 28, true)]
      })
    );
    project.frontMatter.dedication
      .split(/\n{2,}/)
      .filter((item) => item.trim())
      .forEach((paragraph) => children.push(bodyParagraph(paragraph.trim(), true)));
  }

  if (project.frontMatter.preface.trim()) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 160 },
        children: [run("Preface", 28, true)]
      })
    );
    project.frontMatter.preface
      .split(/\n{2,}/)
      .filter((item) => item.trim())
      .forEach((paragraph) => children.push(bodyParagraph(paragraph.trim())));
  }

  if (project.frontMatter.introduction.trim()) {
    children.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 160 },
        children: [run("Introduction", 28, true)]
      })
    );
    project.frontMatter.introduction
      .split(/\n{2,}/)
      .filter((item) => item.trim())
      .forEach((paragraph) => children.push(bodyParagraph(paragraph.trim())));
  }

  children.push(
    new Paragraph({
      pageBreakBefore: true,
      spacing: { after: 140 },
      children: [run("Table des matieres", 28, true)]
    })
  );
  children.push(tocTable(project, layout.tocEntries));

  for (const entry of manuscript) {
    children.push(chapterTitle(entry.chapter.title));

    const chapterImage = entry.chapter.selectedIllustrationDataUrl
      ? imageParagraph(entry.chapter.selectedIllustrationDataUrl, entry.chapter.title)
      : null;

    if (chapterImage) {
      children.push(chapterImage);
    }

    if (entry.blocks.length === 0) {
      children.push(bodyParagraph("Chapitre a completer.", true));
      continue;
    }

    for (const block of entry.blocks) {
      if (block.type === "heading") {
        children.push(subHeading(block.text));
        continue;
      }

      if (block.type === "list") {
        block.items.forEach((item) => children.push(bulletParagraph(item)));
        continue;
      }

      children.push(bodyParagraph(block.text));
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: Math.round(layout.topMarginIn * 1440),
              bottom: Math.round(layout.bottomMarginIn * 1440),
              left: Math.round(layout.insideMarginIn * 1440),
              right: Math.round(layout.outsideMarginIn * 1440)
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: BODY_FONT,
                    color: BLACK,
                    size: 20
                  })
                ]
              })
            ]
          })
        },
        children
      }
    ]
  });

  return Packer.toBuffer(document);
}
