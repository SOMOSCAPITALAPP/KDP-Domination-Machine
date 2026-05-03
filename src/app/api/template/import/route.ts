import { NextResponse } from "next/server";
import { importCollectionTemplate } from "@/lib/template-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const collectionName = String(formData.get("collectionName") || "");
    const targetVolumeTopic = String(formData.get("targetVolumeTopic") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier modele manquant." }, { status: 400 });
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
    const result = await importCollectionTemplate({
      fileName,
      fileBuffer: buffer,
      collectionName,
      targetVolumeTopic
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import du modele impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
