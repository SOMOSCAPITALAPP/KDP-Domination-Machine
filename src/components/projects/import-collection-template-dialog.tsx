"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { BOOK_FORMATS, TRANSLATION_LANGUAGES } from "@/lib/constants";
import type { BookFormat, ImportWorkflowMode, TranslationLanguage } from "@/lib/types";

export function ImportCollectionTemplateDialog({
  onImport
}: {
  onImport: (payload: {
    file: File;
    mode: ImportWorkflowMode;
    targetVolumeTopic?: string;
    format?: BookFormat;
    targetLanguage?: TranslationLanguage;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportWorkflowMode>("collection");
  const [targetVolumeTopic, setTargetVolumeTopic] = useState("");
  const [format, setFormat] = useState<BookFormat>("100 pages");
  const [targetLanguage, setTargetLanguage] = useState<TranslationLanguage>("anglais");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return;
    if (mode === "collection" && !targetVolumeTopic.trim()) return;
    setBusy(true);
    try {
      await onImport({
        file,
        mode,
        targetVolumeTopic: targetVolumeTopic.trim(),
        format,
        targetLanguage
      });
      setOpen(false);
      setFile(null);
      setTargetVolumeTopic("");
      setFormat("100 pages");
      setTargetLanguage("anglais");
      setMode("collection");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button className="w-full bg-white text-ink hover:bg-slate-50" variant="secondary" onClick={() => setOpen(true)}>
        Importer modele PDF / DOCX
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-ink">Mode d'import</span>
          <Select value={mode} onChange={(event) => setMode(event.target.value as ImportWorkflowMode)}>
            <option value="collection">Nouveau livre depuis structure</option>
            <option value="translation">Traduction professionnelle</option>
          </Select>
        </label>
        {mode === "collection" ? (
          <>
            <Input
              value={targetVolumeTopic}
              onChange={(event) => setTargetVolumeTopic(event.target.value)}
              placeholder="Theme du nouveau livre"
            />
            <label className="block text-sm font-medium text-ink">
              <span className="mb-2 block">Taille cible du nouveau livre</span>
              <Select value={format} onChange={(event) => setFormat(event.target.value as BookFormat)}>
                {BOOK_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            </label>
          </>
        ) : (
          <label className="block text-sm font-medium text-ink">
            <span className="mb-2 block">Langue cible de traduction</span>
            <Select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value as TranslationLanguage)}
            >
              {TRANSLATION_LANGUAGES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="block rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="block font-medium text-ink">Livre source publie</span>
          <span className="mt-1 block text-xs text-slate-500">
            {mode === "collection"
              ? "PDF ou DOCX d'un livre deja publie. L'application reutilise sa structure pour generer un nouveau livre sur ton theme."
              : "PDF ou DOCX d'un livre deja ecrit. L'application prepare une traduction professionnelle dans la langue cible, chapitre par chapitre."}
          </span>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={!file || (mode === "collection" && !targetVolumeTopic.trim()) || busy}
            onClick={() => void submit()}
          >
            {busy ? "Import..." : mode === "collection" ? "Analyser le modele" : "Preparer la traduction"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
