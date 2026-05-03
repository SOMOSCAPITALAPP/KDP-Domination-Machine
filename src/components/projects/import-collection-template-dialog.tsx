"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImportCollectionTemplateDialog({
  onImport
}: {
  onImport: (payload: {
    file: File;
    collectionName: string;
    targetVolumeTopic: string;
  }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [targetVolumeTopic, setTargetVolumeTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return;
    setBusy(true);
    await onImport({
      file,
      collectionName,
      targetVolumeTopic
    });
    setBusy(false);
    setOpen(false);
    setFile(null);
    setCollectionName("");
    setTargetVolumeTopic("");
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
        <Input
          value={collectionName}
          onChange={(event) => setCollectionName(event.target.value)}
          placeholder="Nom de la collection"
        />
        <Input
          value={targetVolumeTopic}
          onChange={(event) => setTargetVolumeTopic(event.target.value)}
          placeholder="Sujet du nouveau volume"
        />
        <label className="block rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
          <span className="block font-medium text-ink">Livre source publie</span>
          <span className="mt-1 block text-xs text-slate-500">
            PDF ou DOCX d'un livre deja publie pour repliquer le meme type de sommaire.
          </span>
          <input
            className="mt-3 block w-full text-sm"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <div className="flex gap-2">
          <Button className="flex-1" disabled={!file || busy} onClick={() => void submit()}>
            {busy ? "Import..." : "Analyser le modele"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
