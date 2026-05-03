import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import type { BookProject } from "@/lib/types";

function sectionTitle(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 }
  });
}

function bodyParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 120 }
  });
}

export async function buildProjectDocx(project: BookProject) {
  const children: Paragraph[] = [
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: project.packaging.seoSubtitle || project.promise || "Manuscrit KDP",
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 }
    })
  ];

  if (project.promise.trim()) {
    children.push(sectionTitle("Promesse"));
    children.push(bodyParagraph(project.promise));
  }

  if (project.tableOfContents.trim()) {
    children.push(sectionTitle("Table des matieres"));
    for (const line of project.tableOfContents.split("\n").filter((item) => item.trim())) {
      children.push(bodyParagraph(line.trim()));
    }
  }

  for (const chapter of project.chapters) {
    children.push(
      new Paragraph({
        text: chapter.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 }
      })
    );

    if (chapter.summary.trim()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Resume: ", bold: true }),
            new TextRun(chapter.summary)
          ],
          spacing: { after: 120 }
        })
      );
    }

    if (chapter.learningGoal.trim()) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Objectif pedagogique: ", bold: true }),
            new TextRun(chapter.learningGoal)
          ],
          spacing: { after: 160 }
        })
      );
    }

    for (const paragraph of chapter.content.split(/\n{2,}/).filter((item) => item.trim())) {
      children.push(bodyParagraph(paragraph.trim()));
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(document);
}
