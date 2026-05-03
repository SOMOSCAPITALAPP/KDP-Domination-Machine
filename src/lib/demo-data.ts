import { createProject } from "@/lib/storage";

export const demoProject = {
  ...createProject({
    title: "Leadership calme pour entrepreneurs solo",
    language: "Francais",
    niche: "Business / productivite emotionnelle",
    audience: "Entrepreneurs epuises qui veulent retrouver leur clarte",
    format: "100 pages",
    type: "livre business",
    tone: "premium",
    businessGoal: "Creer un actif KDP rentable et un lead magnet premium",
    depth: "standard"
  }),
  promise: "Aider un entrepreneur solo a reprendre du controle mental en 30 jours.",
  readerAvatar: "Fondateur solo deborde, intelligent, mais disperse et sous pression.",
  painPoint: "Il accumule les decisions, perd sa concentration et doute de sa trajectoire.",
  finalBenefit: "Une methode simple pour retrouver clarte, energie et coherence.",
  differentiator: "Leadership interieur applique a la realite d'un solo founder.",
  competitionRisks: "Le sujet peut sembler trop large si l'angle business n'est pas assez concret.",
  amazonPositioning: "Petit guide transformationnel premium, pratico-pratique et actionnable.",
  ideas: [
    {
      title: "Leadership calme pour entrepreneurs solo",
      subtitle: "30 jours pour reprendre le controle mental",
      score: 86,
      angle: "Croisement entre business, psychologie et endurance entrepreneuriale."
    }
  ]
};
