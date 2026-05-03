import { NextResponse } from "next/server";
import { buildProjectPdf } from "@/lib/pdf";
import type { BookProject } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project: BookProject };
    const { bytes, meta } = await buildProjectPdf(body.project);
    const fileName = `${slugify(body.project.title)}-${body.project.id.slice(0, 8)}-kdp-interior.pdf`;

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "x-kdp-page-count": String(meta.pageCount),
        "x-kdp-trim-size": meta.trimSize,
        "x-kdp-bleed": meta.bleed ? "yes" : "no",
        "x-kdp-inside-margin": String(meta.insideMarginIn),
        "x-kdp-outside-margin": String(meta.outsideMarginIn),
        "x-kdp-top-margin": String(meta.topMarginIn),
        "x-kdp-bottom-margin": String(meta.bottomMarginIn),
        "x-ai-model": meta.model
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
