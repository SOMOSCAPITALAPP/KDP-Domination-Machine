import { NextResponse } from "next/server";
import JSZip from "jszip";
import { buildProjectDocx } from "@/lib/docx";
import { exportProjectBundle } from "@/lib/exporters";
import type { BookProject } from "@/lib/types";

export const runtime = "nodejs";

function asText(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project: BookProject };
    const bundle = exportProjectBundle(body.project);
    const archive = new JSZip();
    const root = archive.folder(bundle.folderName);

    if (!root) {
      throw new Error("Impossible de preparer le dossier d'export.");
    }

    root.file("README.txt", asText(bundle.readme));
    root.file("project.json", asText(bundle.json));
    root.file("manuscript.md", asText(bundle.markdown));
    root.file("manuscript.html", asText(bundle.html));
    root.file("manuscript.txt", asText(bundle.text));
    root.file("project-sheet.csv", asText(bundle.csv));
    root.file("cover-brief.md", asText(bundle.coverBrief));
    root.file("packaging.md", asText(bundle.packaging));
    root.file("checklist-kdp.md", asText(bundle.checklist));
    root.file("manuscript.docx", await buildProjectDocx(body.project));

    const zipBuffer = await archive.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${bundle.folderName}.zip"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
