import type { BookProject } from "@/lib/types";

export function chapterPrompt(project: BookProject, chapterTitle: string, instruction?: string) {
  return `Rédige le chapitre d'un livre KDP.
Livre: ${project.title}
Promesse: ${project.promise}
Public: ${project.audience}
Ton: ${project.tone}
Chapitre: ${chapterTitle}
Instruction spécifique: ${instruction ?? "Version fluide, concrète, pédagogique, sans remplissage."}
Retourne un JSON avec chapterContent.`;
}

