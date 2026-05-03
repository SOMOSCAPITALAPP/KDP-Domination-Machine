import type { BookProject } from "@/lib/types";
import { formatChapterMarkdown, slugify } from "@/lib/utils";

export function exportProjectBundle(project: BookProject) {
  const folderName = `${slugify(project.title)}-${project.id.slice(0, 8)}`;
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
      "total_words"
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
      String(project.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0))
    ],
    [],
    [
      "chapter_id",
      "chapter_title",
      "target_words",
      "word_count",
      "summary",
      "learning_goal"
    ],
    ...project.chapters.map((chapter) => [
      chapter.id,
      escapeCsv(chapter.title),
      String(chapter.targetWords),
      String(chapter.wordCount),
      escapeCsv(chapter.summary),
      escapeCsv(chapter.learningGoal)
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
    readme: [
      "KDP Domination Machine bundle",
      `Projet: ${project.title}`,
      "Fichiers inclus: manuscript.md, manuscript.html, manuscript.txt, project.json, manuscript.docx, project-sheet.csv, packaging.md, cover-brief.md, checklist-kdp.md, README.txt"
    ].join("\n")
  };
}

function escapeCsv(value: string) {
  const normalized = value.replace(/"/g, "\"\"");
  return `"${normalized}"`;
}
