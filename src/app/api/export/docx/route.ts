import { NextResponse } from "next/server";
import { buildProjectDocx } from "@/lib/docx";
import type { BookProject } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { project: BookProject };
    const fileName = `${slugify(body.project.title)}-${body.project.id.slice(0, 8)}.docx`;
    const buffer = await buildProjectDocx(body.project);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DOCX impossible.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
