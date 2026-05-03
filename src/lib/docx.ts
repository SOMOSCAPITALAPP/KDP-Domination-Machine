import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  TextRun
} from "docx";
import { buildCleanManuscript, parseImageDataUrl } from "@/lib/manuscript";
import type { BookProject } from "@/lib/types";

function sectionTitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 180 }
  });
}

function chapterTitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    pageBreakBefore: true
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 25 })],
    spacing: { after: 180, line: 420 }
  });
}

function subHeading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 }
  });
}

function bulletParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 25 })],
    bullet: { level: 0 },
    spacing: { after: 120, line: 380 }
  });
}

function imageParagraph(dataUrl: string, title: string) {
  const image = parseImageDataUrl(dataUrl);
  if (!image) return null;

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240 },
    children: [
      new ImageRun({
        data: image.bytes,
        type: image.mimeType === "image/png" ? "png" : "jpg",
        transformation: {
          width: 430,
          height: 270
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

export async function buildProjectDocx(project: BookProject) {
  const manuscript = buildCleanManuscript(project);
  const children: Paragraph[] = [
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 }
    }),
    new Paragraph({
      text: project.packaging.seoSubtitle || project.promise || "Manuscrit KDP",
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 }
    }),
    new Paragraph({
      text: project.frontMatter.authorName || "",
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 }
    })
  ];

  if (project.frontMatter.preface.trim()) {
    children.push(sectionTitle("Preface"));
    for (const paragraph of project.frontMatter.preface.split(/\n{2,}/).filter((item) => item.trim())) {
      children.push(bodyParagraph(paragraph.trim()));
    }
  }

  if (project.frontMatter.introduction.trim()) {
    children.push(sectionTitle("Introduction"));
    for (const paragraph of project.frontMatter.introduction.split(/\n{2,}/).filter((item) => item.trim())) {
      children.push(bodyParagraph(paragraph.trim()));
    }
  }

  if (project.tableOfContents.trim()) {
    children.push(sectionTitle("Table des matieres"));
    for (const line of project.tableOfContents.split("\n").filter((item) => item.trim())) {
      children.push(bodyParagraph(line.trim()));
    }
  }

  for (const entry of manuscript) {
    children.push(chapterTitle(entry.chapter.title));

    const chapterImage = entry.chapter.selectedIllustrationDataUrl
      ? imageParagraph(entry.chapter.selectedIllustrationDataUrl, entry.chapter.title)
      : null;

    if (chapterImage) {
      children.push(chapterImage);
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
              top: 1440,
              bottom: 1440,
              left: 1260,
              right: 1260
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT] })]
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
