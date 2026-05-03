"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Download, FileCheck2, Sparkles, Wand2 } from "lucide-react";
import { SectionCard } from "@/components/projects/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { initialCompliance } from "@/lib/constants";
import { estimateProgress, slugify } from "@/lib/utils";
import type {
  BookProject,
  BookProjectSectionKey,
  Chapter,
  GeneratedPayload,
  GenerationKind
} from "@/lib/types";

const TAB_ITEMS: { id: BookProjectSectionKey; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "concept", label: "Concept Best-Seller" },
  { id: "outline", label: "Plan du livre" },
  { id: "chapters", label: "Redaction" },
  { id: "correction", label: "Correction" },
  { id: "packaging", label: "Packaging KDP" },
  { id: "export", label: "Export" }
];

export function BookWorkspace({
  project,
  onProjectChange
}: {
  project: BookProject;
  onProjectChange: (project: BookProject) => void;
}) {
  const [tab, setTab] = useState<BookProjectSectionKey>("overview");
  const [busy, setBusy] = useState<string>("");
  const deferredProject = useDeferredValue(project);

  useEffect(() => {
    const next = {
      ...project,
      progress: estimateProgress(project),
      updatedAt: new Date().toISOString()
    };
    if (next.progress !== project.progress) {
      onProjectChange(next);
    }
  }, [onProjectChange, project]);

  function patch(partial: Partial<BookProject>) {
    onProjectChange({
      ...project,
      ...partial,
      progress: estimateProgress({ ...project, ...partial }),
      updatedAt: new Date().toISOString()
    });
  }

  async function generate(kind: GenerationKind, chapterId?: string) {
    setBusy(kind);
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, project, chapterId })
    });
    const data = (await response.json()) as GeneratedPayload & { error?: string };
    setBusy("");
    if (!response.ok || data.error) {
      alert(data.error ?? "Generation impossible.");
      return;
    }

    const updated = applyGeneratedPayload(project, kind, data, chapterId);
    onProjectChange(updated);
  }

  async function exportBundle() {
    setBusy("export");
    const response = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project })
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setBusy("");
      alert(data.error ?? "Export impossible.");
      return;
    }

    const blob = await response.blob();
    setBusy("");
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${slugify(project.title)}-${project.id.slice(0, 8)}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="space-y-4">
      <Tabs items={TAB_ITEMS} value={tab} onChange={(value) => setTab(value as BookProjectSectionKey)} />

      {tab === "overview" ? (
        <SectionCard title="Fiche projet">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Titre de travail" value={project.title} onChange={(value) => patch({ title: value })} />
            <Field label="Niche" value={project.niche} onChange={(value) => patch({ niche: value })} />
            <Field label="Public cible" value={project.audience} onChange={(value) => patch({ audience: value })} />
            <Field label="Objectif commercial" value={project.businessGoal} onChange={(value) => patch({ businessGoal: value })} />
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <InfoCard label="Ton" value={project.tone} />
            <InfoCard label="Format" value={project.format} />
            <InfoCard label="Profondeur" value={project.depth} />
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Progression globale</p>
            <Progress value={deferredProject.progress} />
          </div>
        </SectionCard>
      ) : null}

      {tab === "concept" ? (
        <SectionCard
          title="Concept Best-Seller"
          actions={
            <Button onClick={() => void generate("concept")} disabled={busy === "concept"}>
              <Sparkles className="mr-2 h-4 w-4" />
              {busy === "concept" ? "Generation..." : "Generer le concept"}
            </Button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TextareaBlock label="Promesse" value={project.promise} onChange={(value) => patch({ promise: value })} />
            <TextareaBlock label="Avatar lecteur" value={project.readerAvatar} onChange={(value) => patch({ readerAvatar: value })} />
            <TextareaBlock label="Probleme douloureux" value={project.painPoint} onChange={(value) => patch({ painPoint: value })} />
            <TextareaBlock label="Benefice final" value={project.finalBenefit} onChange={(value) => patch({ finalBenefit: value })} />
            <TextareaBlock label="Angle differenciant" value={project.differentiator} onChange={(value) => patch({ differentiator: value })} />
            <TextareaBlock label="Risques de concurrence" value={project.competitionRisks} onChange={(value) => patch({ competitionRisks: value })} />
            <TextareaBlock label="Positionnement Amazon" value={project.amazonPositioning} onChange={(value) => patch({ amazonPositioning: value })} />
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-ink">10 idees scorees</p>
            <div className="mt-3 grid gap-3">
              {project.ideas.map((idea) => (
                <div key={idea.title} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{idea.title}</p>
                    <Badge>{idea.score}/100</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{idea.subtitle}</p>
                  <p className="mt-2 text-sm text-slate-600">{idea.angle}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {tab === "outline" ? (
        <SectionCard
          title="Plan du livre"
          actions={
            <Button onClick={() => void generate("outline")} disabled={busy === "outline"}>
              <Sparkles className="mr-2 h-4 w-4" />
              {busy === "outline" ? "Generation..." : "Generer le plan"}
            </Button>
          }
        >
          <Textarea
            rows={5}
            value={project.tableOfContents}
            onChange={(event) => patch({ tableOfContents: event.target.value })}
            placeholder="Table des matieres"
          />
          <div className="mt-5 space-y-3">
            {project.chapters.map((chapter) => (
              <div key={chapter.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 className="font-medium text-ink">{chapter.title}</h4>
                  <Badge>{chapter.targetWords} mots</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{chapter.summary}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Objectif pedagogique
                </p>
                <p className="text-sm text-slate-600">{chapter.learningGoal}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Progression emotionnelle
                </p>
                <p className="text-sm text-slate-600">{chapter.emotionalShift}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "chapters" ? (
        <SectionCard title="Redaction chapitre par chapitre">
          <div className="space-y-4">
            {project.chapters.map((chapter) => (
              <ChapterEditor
                key={chapter.id}
                busy={busy}
                chapter={chapter}
                onChange={(nextChapter) =>
                  patch({
                    chapters: project.chapters.map((item) =>
                      item.id === nextChapter.id ? nextChapter : item
                    )
                  })
                }
                onGenerate={(kind) => void generate(kind, chapter.id)}
              />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "correction" ? (
        <SectionCard
          title="Correction et humanisation"
          actions={
            <div className="flex flex-wrap gap-2">
              {[
                ["correction", "Corriger"],
                ["rewriteHuman", "Rendre plus humain"],
                ["compliance", "Verifier conformite"]
              ].map(([kind, label]) => (
                <Button
                  key={kind}
                  variant="secondary"
                  onClick={() => void generate(kind as GenerationKind)}
                  disabled={busy === kind}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          }
        >
          <Textarea
            rows={12}
            value={project.correctionNotes}
            onChange={(event) => patch({ correctionNotes: event.target.value })}
          />
          <div className="mt-5 space-y-3">
            {project.alerts.map((alert) => (
              <div key={alert} className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                {alert}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {tab === "packaging" ? (
        <SectionCard
          title="Packaging KDP"
          actions={
            <div className="flex flex-wrap gap-2">
              {[
                ["packaging", "Generer packaging"],
                ["keywords", "Generer mots-cles"],
                ["coverBrief", "Brief couverture"]
              ].map(([kind, label]) => (
                <Button
                  key={kind}
                  onClick={() => void generate(kind as GenerationKind)}
                  disabled={busy === kind}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          }
        >
          <div className="grid gap-4">
            <TextareaBlock
              label="Description Amazon (HTML simple)"
              value={project.packaging.amazonDescription}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, amazonDescription: value } })
              }
            />
            <TextareaBlock
              label="7 bullet points vendeurs"
              value={project.packaging.bullets.join("\n")}
              onChange={(value) =>
                patch({
                  packaging: { ...project.packaging, bullets: value.split("\n").filter(Boolean) }
                })
              }
            />
            <TextareaBlock
              label="Mots-cles backend"
              value={project.packaging.keywords.join(", ")}
              onChange={(value) =>
                patch({
                  packaging: {
                    ...project.packaging,
                    keywords: value.split(",").map((item) => item.trim()).filter(Boolean)
                  }
                })
              }
            />
            <TextareaBlock
              label="Categories proposees"
              value={project.packaging.categories.join("\n")}
              onChange={(value) =>
                patch({
                  packaging: {
                    ...project.packaging,
                    categories: value.split("\n").map((item) => item.trim()).filter(Boolean)
                  }
                })
              }
            />
            <TextareaBlock
              label="Titre optimise SEO"
              value={project.packaging.seoTitle}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, seoTitle: value } })
              }
            />
            <TextareaBlock
              label="Sous-titre optimise SEO"
              value={project.packaging.seoSubtitle}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, seoSubtitle: value } })
              }
            />
            <TextareaBlock
              label="Bio auteur adaptee"
              value={project.packaging.authorBio}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, authorBio: value } })
              }
            />
            <TextareaBlock
              label="Phrase d'accroche couverture"
              value={project.packaging.coverHook}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, coverHook: value } })
              }
            />
            <TextareaBlock
              label="Brief couverture"
              value={project.packaging.coverBrief}
              onChange={(value) =>
                patch({ packaging: { ...project.packaging, coverBrief: value } })
              }
            />
          </div>
        </SectionCard>
      ) : null}

      {tab === "export" ? (
        <SectionCard
          title="Export et checklist"
          actions={
            <Button onClick={() => void exportBundle()} disabled={busy === "export"}>
              <Download className="mr-2 h-4 w-4" />
              {busy === "export" ? "Export..." : "Exporter le dossier"}
            </Button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-medium text-ink">Nom de dossier suggere</p>
              <p className="mt-2 font-mono text-sm text-slate-600">
                {slugify(project.title)}-{project.id.slice(0, 8)}
              </p>
              <p className="mt-4 text-sm text-slate-600">
                Contenu prevu : `ZIP`, `Markdown`, `JSON`, `HTML`, `TXT`, `DOCX`, `CSV`, `packaging`, `brief couverture`, `checklist`.
              </p>
            </div>
            <div className="space-y-2">
              {project.compliance.map((item) => (
                <label key={item.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <input
                    checked={item.checked}
                    type="checkbox"
                    onChange={(event) =>
                      patch({
                        compliance: project.compliance.map((current) =>
                          current.id === item.id
                            ? { ...current, checked: event.target.checked }
                            : current
                        )
                      })
                    }
                  />
                  <div>
                    <p className="font-medium text-ink">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.note}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-ink p-4 text-sm text-slate-100">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-amber-300" />
              Declaration IA KDP requise avant upload
            </div>
            <p className="mt-2 leading-7 text-slate-300">
              Verifie si le contenu releve de `AI-generated` ou `AI-assisted`, puis
              declare correctement cette information dans le formulaire KDP avant publication.
            </p>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextareaBlock({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <Textarea rows={6} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 font-medium text-ink">{value}</p>
    </div>
  );
}

function ChapterEditor({
  chapter,
  onChange,
  onGenerate,
  busy
}: {
  chapter: Chapter;
  onChange: (chapter: Chapter) => void;
  onGenerate: (kind: GenerationKind) => void;
  busy: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-ink">{chapter.title}</h4>
          <p className="mt-1 text-sm text-slate-500">
            Objectif: {chapter.targetWords} mots • Actuel: {chapter.wordCount}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["chapter", "Generer chapitre"],
            ["rewriteHuman", "Reecrire plus humain"],
            ["develop", "Developper"],
            ["simplify", "Simplifier"],
            ["examples", "Ajouter exemples"]
          ].map(([kind, label]) => (
            <Button
              key={kind}
              variant="secondary"
              onClick={() => onGenerate(kind as GenerationKind)}
              disabled={busy === kind}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <Textarea
        className="mt-4"
        rows={12}
        value={chapter.content}
        onChange={(event) =>
          onChange({
            ...chapter,
            content: event.target.value,
            wordCount: event.target.value.split(/\s+/).filter(Boolean).length
          })
        }
      />
    </article>
  );
}

function applyGeneratedPayload(
  project: BookProject,
  kind: GenerationKind,
  data: GeneratedPayload,
  chapterId?: string
): BookProject {
  const next = { ...project };

  if (data.ideas) next.ideas = data.ideas;
  if (data.commercialScore) next.commercialScore = data.commercialScore;
  if (data.promise) next.promise = data.promise;
  if (data.readerAvatar) next.readerAvatar = data.readerAvatar;
  if (data.painPoint) next.painPoint = data.painPoint;
  if (data.finalBenefit) next.finalBenefit = data.finalBenefit;
  if (data.differentiator) next.differentiator = data.differentiator;
  if (data.competitionRisks) next.competitionRisks = data.competitionRisks;
  if (data.amazonPositioning) next.amazonPositioning = data.amazonPositioning;
  if (data.tableOfContents) next.tableOfContents = data.tableOfContents;
  if (data.chapters) next.chapters = data.chapters;
  if (data.correctionNotes) next.correctionNotes = data.correctionNotes;
  if (data.alerts) next.alerts = data.alerts;
  if (data.compliance) next.compliance = data.compliance.length ? data.compliance : initialCompliance();

  if (data.packaging) {
    next.packaging = {
      ...next.packaging,
      ...data.packaging
    };
  }

  if (chapterId && data.chapterContent) {
    next.chapters = next.chapters.map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            content: data.chapterContent ?? chapter.content,
            wordCount: (data.chapterContent ?? "").split(/\s+/).filter(Boolean).length
          }
        : chapter
    );
  }

  if (kind === "rewriteHuman" && !chapterId && data.manuscript) {
    next.chapters = next.chapters.map((chapter, index) => ({
      ...chapter,
      content: data.manuscript?.[index] ?? chapter.content,
      wordCount: (data.manuscript?.[index] ?? chapter.content).split(/\s+/).filter(Boolean).length
    }));
  }

  next.progress = estimateProgress(next);
  next.updatedAt = new Date().toISOString();
  return next;
}
