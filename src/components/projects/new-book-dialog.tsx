"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BOOK_FORMATS, BOOK_TYPES, DEPTH_LEVELS, TONES } from "@/lib/constants";
import type {
  BookFormat,
  BookProjectInput,
  BookTone,
  BookType,
  DepthLevel
} from "@/lib/types";

export function NewBookDialog({
  onCreate
}: {
  onCreate: (input: BookProjectInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BookProjectInput>({
    title: "Nouveau projet KDP",
    language: "Francais",
    niche: "",
    audience: "",
    format: "100 pages",
    type: "guide pratique",
    tone: "expert",
    businessGoal: "",
    depth: "standard"
  });

  function update<K extends keyof BookProjectInput>(key: K, value: BookProjectInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (!open) {
    return (
      <Button className="w-full" onClick={() => setOpen(true)}>
        Nouveau livre
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-3">
        <Input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Titre de travail" />
        <Input value={form.language} onChange={(event) => update("language", event.target.value)} placeholder="Langue" />
        <Input value={form.niche} onChange={(event) => update("niche", event.target.value)} placeholder="Niche" />
        <Input value={form.audience} onChange={(event) => update("audience", event.target.value)} placeholder="Public cible" />
        <Select value={form.format} onChange={(event) => update("format", event.target.value as BookFormat)}>
          {BOOK_FORMATS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select value={form.type} onChange={(event) => update("type", event.target.value as BookType)}>
          {BOOK_TYPES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select value={form.tone} onChange={(event) => update("tone", event.target.value as BookTone)}>
          {TONES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Select value={form.depth} onChange={(event) => update("depth", event.target.value as DepthLevel)}>
          {DEPTH_LEVELS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
        <Textarea
          value={form.businessGoal}
          onChange={(event) => update("businessGoal", event.target.value)}
          placeholder="Objectif commercial"
          rows={3}
        />
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              onCreate(form);
              setOpen(false);
            }}
          >
            Creer
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
