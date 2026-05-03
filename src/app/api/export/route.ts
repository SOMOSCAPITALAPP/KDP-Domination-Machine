import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { exportProjectBundle } from "@/lib/exporters";
import type { BookProject } from "@/lib/types";

const PYTHON =
  "C:\\Users\\olivo\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

function runDocxScript(jsonPath: string, docxPath: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(PYTHON, ["scripts/export_docx.py", jsonPath, docxPath], {
      cwd: process.cwd()
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || "Échec de génération DOCX."));
    });
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { project: BookProject };
  const bundle = exportProjectBundle(body.project);
  const root = join(process.cwd(), "exports", bundle.folderName);
  await mkdir(root, { recursive: true });

  const jsonPath = join(root, "project.json");
  const docxPath = join(root, "manuscript.docx");

  await Promise.all([
    writeFile(join(root, "README.txt"), bundle.readme, "utf8"),
    writeFile(jsonPath, bundle.json, "utf8"),
    writeFile(join(root, "manuscript.md"), bundle.markdown, "utf8"),
    writeFile(join(root, "manuscript.html"), bundle.html, "utf8"),
    writeFile(join(root, "manuscript.txt"), bundle.text, "utf8"),
    writeFile(join(root, "project-sheet.csv"), bundle.csv, "utf8"),
    writeFile(join(root, "cover-brief.md"), bundle.coverBrief, "utf8"),
    writeFile(join(root, "packaging.md"), bundle.packaging, "utf8"),
    writeFile(join(root, "checklist-kdp.md"), bundle.checklist, "utf8")
  ]);

  try {
    await runDocxScript(jsonPath, docxPath);
  } catch (error) {
    await writeFile(
      join(root, "DOCX-ERROR.txt"),
      error instanceof Error ? error.message : "DOCX non généré.",
      "utf8"
    );
  }

  return NextResponse.json({
    ok: true,
    folder: root
  });
}
