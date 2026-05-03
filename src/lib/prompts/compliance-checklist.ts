import type { BookProject } from "@/lib/types";

export function complianceChecklistPrompt(project: BookProject) {
  return `Analyse le livre pour une pré-vérification KDP.
Retourne du JSON avec compliance (tableau d'items checked/note) et alerts.
Points de contrôle: originalité, plagiat, déclaration IA, conformité titre/couverture, promesses à risque, marges, description, mots-clés.`;
}

