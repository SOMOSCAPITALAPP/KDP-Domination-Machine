import type {
  BookFormat,
  BookStatus,
  BookTone,
  BookType,
  ComplianceItem,
  DepthLevel,
  FrontMatterData,
  PaperbackLayout,
  TrimSize
} from "@/lib/types";

export const AI_MODEL_NAME = "gpt-4.1-mini";

export const BOOK_FORMATS: BookFormat[] = [
  "50 pages",
  "100 pages",
  "200 pages",
  "250 pages",
  "300 pages"
];

export const BOOK_TYPES: BookType[] = [
  "guide pratique",
  "developpement personnel",
  "esoterisme",
  "finance",
  "lithotherapie",
  "journal guide",
  "livre business",
  "autre"
];

export const TONES: BookTone[] = ["expert", "emotionnel", "pedagogique", "premium", "populaire"];
export const DEPTH_LEVELS: DepthLevel[] = ["leger", "standard", "profond"];
export const TRIM_SIZES: TrimSize[] = ["5 x 8 in", "6 x 9 in", "8.5 x 11 in"];

export const DEFAULT_PAPERBACK_LAYOUT: PaperbackLayout = {
  trimSize: "6 x 9 in",
  bleed: false,
  pageNumbers: true
};

export function defaultFrontMatter(): FrontMatterData {
  return {
    authorName: "",
    publisherName: "",
    collectionName: "",
    isbn: "",
    editionNote: "Premiere edition",
    copyrightNotice: "",
    dedication: "",
    preface: "",
    introduction: ""
  };
}

export const PROJECT_STATUSES: BookStatus[] = [
  "Idee",
  "Concept valide",
  "Plan",
  "Redaction",
  "Correction",
  "Mise en page",
  "KDP pret",
  "Publie"
];

export const MODULES = [
  "Dashboard",
  "Concept",
  "Plan",
  "Redaction",
  "Correction",
  "Packaging",
  "Export",
  "Checklist KDP"
];

export function initialCompliance(): ComplianceItem[] {
  return [
    {
      id: "originality",
      label: "Originalite verifiee",
      note: "Le contenu doit etre original et ne pas reprendre un ouvrage existant.",
      checked: false
    },
    {
      id: "plagiarism",
      label: "Pas de plagiat volontaire",
      note: "Verifier les sources, citations et reformulations.",
      checked: false
    },
    {
      id: "ai-disclosure",
      label: "Contenu IA declare si necessaire",
      note: "KDP demande de declarer le contenu AI-generated. AI-assisted n'est pas a declarer.",
      checked: false
    },
    {
      id: "title",
      label: "Titre conforme",
      note: "Le titre doit rester clair, non trompeur et coherent avec le manuscrit.",
      checked: false
    },
    {
      id: "cover",
      label: "Couverture conforme",
      note: "Paperback: fichier couverture separe, dimensions exactes et images 300 DPI.",
      checked: false
    },
    {
      id: "interior",
      label: "Interieur relu",
      note: "Orthographe, coherence, structure et style valides.",
      checked: false
    },
    {
      id: "claims",
      label: "Pas de promesses medicales, financieres ou juridiques trompeuses",
      note: "Supprimer toute promesse dangereuse, absolue ou trompeuse.",
      checked: false
    },
    {
      id: "margins",
      label: "Marges et format verifies",
      note: "Verifier trim size, marges miroir, bleed et PDF interieur.",
      checked: false
    },
    {
      id: "description",
      label: "Description Amazon prete",
      note: "Description claire, vendeuse et honnete.",
      checked: false
    },
    {
      id: "metadata",
      label: "Mots-cles et categories prets",
      note: "Backend keywords et categories alignes au positionnement.",
      checked: false
    }
  ];
}

export const KDP_OFFICIAL_NOTES = [
  {
    title: "Declaration IA KDP",
    summary:
      "KDP demande de declarer le contenu AI-generated. Le contenu AI-assisted n'a pas a etre declare.",
    url: "https://kdp.amazon.com/en_US/help/topic/G200672390"
  },
  {
    title: "Paperback couverture",
    summary:
      "Le paperback attend un fichier couverture separe. Les dimensions et le PDF couverture doivent respecter le calcul KDP.",
    url: "https://kdp.amazon.com/en_US/help/topic/G201953020"
  },
  {
    title: "Manuscrit interieur PDF",
    summary:
      "Le trim size doit etre fixe avant les marges. KDP recommande des marges miroir et un PDF interieur propre avant upload.",
    url: "https://kdp.amazon.com/en_US/help/topic/G202145400"
  }
];
