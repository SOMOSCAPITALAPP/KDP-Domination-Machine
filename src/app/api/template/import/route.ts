import { NextResponse } from "next/server";
import { importCollectionTemplate, importTranslationProject } from "@/lib/template-import";
import type { BookFormat, ImportWorkflowMode, TranslationLanguage } from "@/lib/types";

export const runtime = "nodejs";

function isBookFormat(value: string): value is BookFormat {
  return ["50 pages", "100 pages", "200 pages", "250 pages", "300 pages"].includes(value);
}

function isImportMode(value: string): value is ImportWorkflowMode {
  return value === "collection" || value === "translation";
}

function isTranslationLanguage(value: string): value is TranslationLanguage {
  return [
    "anglais",
    "espagnol",
    "portugais du bresil",
    "italien",
    "allemand",
    "hollandais"
  ].includes(value);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const rawMode = String(formData.get("mode") || "collection");
    const targetVolumeTopic = String(formData.get("targetVolumeTopic") || "");
    const rawFormat = String(formData.get("format") || "100 pages");
    const rawTargetLanguage = String(formData.get("targetLanguage") || "anglais");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier modele manquant." }, { status: 400 });
    }

    if (!isImportMode(rawMode)) {
      return NextResponse.json({ error: "Mode d'import invalide." }, { status: 400 });
    }

    if (rawMode === "collection" && !targetVolumeTopic.trim()) {
      return NextResponse.json({ error: "Le theme du nouveau livre est requis." }, { status: 400 });
    }

    if (rawMode === "collection" && !isBookFormat(rawFormat)) {
      return NextResponse.json({ error: "Format de livre invalide." }, { status: 400 });
    }

    if (rawMode === "translation" && !isTranslationLanguage(rawTargetLanguage)) {
      return NextResponse.json({ error: "Langue de traduction invalide." }, { status: 400 });
    }

    const fileName = file.name || "modele.pdf";
    const isPdf = fileName.toLowerCase().endsWith(".pdf");
    const isDocx = fileName.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: "Formats acceptes: PDF ou DOCX." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result =
      rawMode === "translation"
        ? await importTranslationProject({
            fileName,
            fileBuffer: buffer,
            targetLanguage: rawTargetLanguage as TranslationLanguage
          })
        : await importCollectionTemplate({
            fileName,
            fileBuffer: buffer,
            targetVolumeTopic: targetVolumeTopic.trim(),
            format: rawFormat as BookFormat
          });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import du modele impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
