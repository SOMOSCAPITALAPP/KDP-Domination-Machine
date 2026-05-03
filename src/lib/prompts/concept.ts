import type { BookProject } from "@/lib/types";

export function conceptPrompt(project: BookProject) {
  return `Tu es un stratège Amazon KDP.
Projet: ${project.title}
Niche: ${project.niche}
Public: ${project.audience}
Format: ${project.format}
Type: ${project.type}
Ton: ${project.tone}
Objectif: ${project.businessGoal}

Retourne du JSON avec:
- ideas: 10 idées avec title, subtitle, score, angle
- commercialScore
- promise
- readerAvatar
- painPoint
- finalBenefit
- differentiator
- amazonPositioning`;
}

