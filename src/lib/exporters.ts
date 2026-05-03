import { AI_MODEL_NAME } from "@/lib/constants";
import type { BookProject } from "@/lib/types";
import { formatChapterMarkdown, getPdfPreviewMeta, getTotalWordCount, slugify } from "@/lib/utils";

export function exportProjectBundle(project: BookProject) {
  const folderName = `${slugify(project.title)}-${project.id.slice(0, 8)}`;
  const pdfMeta = getPdfPreviewMeta(project);
  const coverBrief = project.packaging.coverBrief || "";

  const markdown = [
    `# ${project.title}`,
    "",
    "## Sous-titre",
    project.packaging.seoSubtitle || project.promise,
    "",
    "## Promesse",
    project.promise,
    "",
    "## Risques de concurrence",
    project.competitionRisks,
    "",
    "## Table des matieres",
    project.tableOfContents,
    "",
    ...project.chapters.map((chapter) => formatChapterMarkdown(chapter))
  ].join("\n");

  const html = `<html><body>${markdown
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (!line.trim()) return "<br />";
      return `<p>${line}</p>`;
    })
    .join("")}</body></html>`;

  const text = [
    project.title,
    project.promise,
    project.competitionRisks,
    project.tableOfContents,
    ...project.chapters.map((chapter) => chapter.content)
  ].join("\n\n");

  const packaging = [
    "# Packaging KDP",
    "",
    "## Description Amazon",
    project.packaging.amazonDescription,
    "",
    "## Bullet points",
    ...project.packaging.bullets.map((item) => `- ${item}`),
    "",
    "## Mots-cles",
    project.packaging.keywords.join(", "),
    "",
    "## Categories",
    project.packaging.categories.join(", "),
    "",
    "## SEO Title",
    project.packaging.seoTitle,
    "",
    "## SEO Subtitle",
    project.packaging.seoSubtitle,
    "",
    "## Bio auteur",
    project.packaging.authorBio,
    "",
    "## Phrase d'accroche couverture",
    project.packaging.coverHook
  ].join("\n");

  const checklist = [
    "# Checklist KDP",
    "",
    ...project.compliance.map(
      (item) => `- [${item.checked ? "x" : " "}] ${item.label} - ${item.note}`
    )
  ].join("\n");

  const uploadNotes = [
    "# KDP upload notes",
    "",
    `Modele IA verrouille: ${AI_MODEL_NAME}`,
    `Trim size interieur: ${pdfMeta.trimSize}`,
    `Bleed: ${pdfMeta.bleed ? "oui" : "non"}`,
    `Page numbers: ${project.paperback.pageNumbers ? "oui" : "non"}`,
    `Pages estimees pour le PDF interieur: ${pdfMeta.pageCount}`,
    `Marge interieure: ${pdfMeta.insideMarginIn} in`,
    `Marge exterieure: ${pdfMeta.outsideMarginIn} in`,
    `Marge haute: ${pdfMeta.topMarginIn} in`,
    `Marge basse: ${pdfMeta.bottomMarginIn} in`,
    "",
    "Verification KDP:",
    "- Le paperback demande un fichier interieur PDF et un fichier couverture separe.",
    "- Les contenus AI-generated doivent etre declares a la publication KDP.",
    "- Les images de couverture et interieures doivent rester en haute resolution, idealement 300 DPI."
  ].join("\n");

  const csvRows = [
    [
      "project_id",
      "title",
      "status",
      "language",
      "niche",
      "audience",
      "format",
      "type",
      "tone",
      "depth",
      "commercial_score",
      "chapter_count",
      "total_words",
      "trim_size",
      "bleed"
    ],
    [
      project.id,
      escapeCsv(project.title),
      project.status,
      project.language,
      escapeCsv(project.niche),
      escapeCsv(project.audience),
      project.format,
      project.type,
      project.tone,
      project.depth,
      String(project.commercialScore),
      String(project.chapters.length),
      String(getTotalWordCount(project)),
      project.paperback.trimSize,
      project.paperback.bleed ? "yes" : "no"
    ],
    [],
    [
      "chapter_id",
      "chapter_title",
      "target_words",
      "word_count",
      "summary",
      "learning_goal",
      "emotional_shift"
    ],
    ...project.chapters.map((chapter) => [
      chapter.id,
      escapeCsv(chapter.title),
      String(chapter.targetWords),
      String(chapter.wordCount),
      escapeCsv(chapter.summary),
      escapeCsv(chapter.learningGoal),
      escapeCsv(chapter.emotionalShift)
    ])
  ]
    .map((row) => row.join(","))
    .join("\n");

  return {
    folderName,
    json: JSON.stringify(project, null, 2),
    markdown,
    html,
    text,
    csv: csvRows,
    packaging,
    coverBrief,
    checklist,
    uploadNotes,
    readme: [
      "KDP Domination Machine bundle",
      `Projet: ${project.title}`,
      `Modele IA: ${AI_MODEL_NAME}`,
      "Fichiers inclus: manuscript.md, manuscript.html, manuscript.txt, manuscript.docx, manuscript-kdp.pdf, project.json, project-sheet.csv, packaging.md, cover-brief.md, checklist-kdp.md, kdp-upload-notes.md, README.txt"
    ].join("\n")
  };
}

function escapeCsv(value: string) {
  const normalized = value.replace(/"/g, "\"\"");
  return `"${normalized}"`;
}
