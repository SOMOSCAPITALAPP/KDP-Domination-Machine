import { createProject } from "@/lib/storage";

export const demoProject = {
  ...createProject({
    title: "Leadership calme pour entrepreneurs solo",
    language: "Français",
    niche: "Business / productivité émotionnelle",
    audience: "Entrepreneurs épuisés qui veulent garder leur clarté",
    format: "100 pages",
    type: "livre business",
    tone: "premium",
    businessGoal: "Créer un lead magnet premium et un actif KDP rentable",
    depth: "standard"
  }),
  promise: "Aider un entrepreneur solo à reprendre du contrôle mental en 30 jours.",
  readerAvatar: "Fondateur solo débordé, intelligent, mais dispersé et sous pression.",
  painPoint: "Il accumule les décisions, perd sa concentration et doute de sa trajectoire.",
  finalBenefit: "Une méthode simple pour retrouver clarté, énergie et cohérence.",
  differentiator: "Leadership intérieur appliqué à la réalité d’un solo founder.",
  amazonPositioning: "Petit guide transformationnel premium, très pratico-pratique.",
  ideas: [
    {
      title: "Leadership calme pour entrepreneurs solo",
      subtitle: "30 jours pour reprendre le contrôle mental",
      score: 86,
      angle: "Croisement entre business, psychologie et endurance entrepreneuriale."
    }
  ]
};

