import type { BookFormat, BookStatus, BookTone, BookType, ComplianceItem, DepthLevel } from "@/lib/types";

export const BOOK_FORMATS: BookFormat[] = [
  "50 pages",
  "100 pages",
  "200 pages",
  "250 pages",
  "300 pages"
];

export const BOOK_TYPES: BookType[] = [
  "guide pratique",
  "développement personnel",
  "ésotérisme",
  "finance",
  "lithothérapie",
  "journal guidé",
  "livre business",
  "autre"
];

export const TONES: BookTone[] = ["expert", "émotionnel", "pédagogique", "premium", "populaire"];
export const DEPTH_LEVELS: DepthLevel[] = ["léger", "standard", "profond"];

export const PROJECT_STATUSES: BookStatus[] = [
  "Idée",
  "Concept validé",
  "Plan",
  "Rédaction",
  "Correction",
  "Mise en page",
  "KDP prêt",
  "Publié"
];

export const MODULES = [
  "Dashboard",
  "Concept",
  "Plan",
  "Rédaction",
  "Correction",
  "Packaging",
  "Export",
  "Checklist KDP"
];

export function initialCompliance(): ComplianceItem[] {
  return [
    {
      id: "originality",
      label: "Originalité vérifiée",
      note: "Le contenu doit être propre au projet et ne pas reprendre un ouvrage existant.",
      checked: false
    },
    {
      id: "plagiarism",
      label: "Pas de plagiat volontaire",
      note: "Valider les sources, citations et reformulations.",
      checked: false
    },
    {
      id: "ai-disclosure",
      label: "Contenu IA déclaré si nécessaire",
      note: "Amazon distingue AI-generated et AI-assisted dans le formulaire KDP.",
      checked: false
    },
    {
      id: "title",
      label: "Titre conforme",
      note: "Titre clair, non trompeur, cohérent avec le manuscrit.",
      checked: false
    },
    {
      id: "cover",
      label: "Couverture conforme",
      note: "Fichier couverture séparé, bon format, 300 DPI recommandé.",
      checked: false
    },
    {
      id: "interior",
      label: "Intérieur relu",
      note: "Orthographe, cohérence, structure et style validés.",
      checked: false
    },
    {
      id: "claims",
      label: "Pas de fausses promesses médicales, financières ou juridiques",
      note: "Supprimer toute promesse dangereuse, trompeuse ou trop absolue.",
      checked: false
    },
    {
      id: "margins",
      label: "Marges et format vérifiés",
      note: "Vérifier dimensions, fond perdu, marges et PDF intérieur.",
      checked: false
    },
    {
      id: "description",
      label: "Description Amazon prête",
      note: "Description claire, vendeuse et honnête.",
      checked: false
    },
    {
      id: "metadata",
      label: "Mots-clés et catégories prêts",
      note: "Backend keywords et catégories alignés au positionnement.",
      checked: false
    }
  ];
}

export const KDP_OFFICIAL_NOTES = [
  {
    title: "Déclaration IA KDP",
    summary:
      "KDP demande de déclarer si un contenu est AI-generated, tout en distinguant ce cas du contenu AI-assisted.",
    url: "https://kdp.amazon.com/en_US/help/topic/G200672390"
  },
  {
    title: "Couverture paperback",
    summary:
      "Le paperback attend un fichier couverture distinct et KDP détaille les exigences de dimensions, fond perdu et PDF prêt à l’impression.",
    url: "https://kdp.amazon.com/en_US/help/topic/G201953020"
  },
  {
    title: "Préparation du manuscrit intérieur",
    summary:
      "Le fichier intérieur doit respecter les règles de formatage, marges, qualité d’image et export PDF pour éviter les erreurs d’upload.",
    url: "https://kdp.amazon.com/en_US/help/topic/G202145400"
  }
];

