export type BookStatus =
  | "Idee"
  | "Concept valide"
  | "Plan"
  | "Redaction"
  | "Correction"
  | "Mise en page"
  | "KDP pret"
  | "Publie";

export type BookFormat = "50 pages" | "100 pages" | "200 pages" | "250 pages" | "300 pages";
export type BookTone = "expert" | "emotionnel" | "pedagogique" | "premium" | "populaire";
export type BookType =
  | "guide pratique"
  | "developpement personnel"
  | "esoterisme"
  | "finance"
  | "lithotherapie"
  | "journal guide"
  | "livre business"
  | "autre";
export type DepthLevel = "leger" | "standard" | "profond";
export type TrimSize = "5 x 8 in" | "6 x 9 in" | "8.5 x 11 in";

export type BookProjectInput = {
  title: string;
  language: string;
  niche: string;
  audience: string;
  format: BookFormat;
  type: BookType;
  tone: BookTone;
  businessGoal: string;
  depth: DepthLevel;
};

export type Idea = {
  title: string;
  subtitle: string;
  score: number;
  angle: string;
};

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  learningGoal: string;
  emotionalShift: string;
  targetWords: number;
  wordCount: number;
  content: string;
};

export type ComplianceItem = {
  id: string;
  label: string;
  note: string;
  checked: boolean;
};

export type PackagingData = {
  amazonDescription: string;
  bullets: string[];
  keywords: string[];
  categories: string[];
  seoTitle: string;
  seoSubtitle: string;
  authorBio: string;
  coverHook: string;
  coverBrief: string;
};

export type PaperbackLayout = {
  trimSize: TrimSize;
  bleed: boolean;
  pageNumbers: boolean;
};

export type PdfPreviewMeta = {
  pageCount: number;
  trimSize: TrimSize;
  bleed: boolean;
  insideMarginIn: number;
  outsideMarginIn: number;
  topMarginIn: number;
  bottomMarginIn: number;
  estimatedWords: number;
  model: string;
};

export type BookProject = BookProjectInput & {
  id: string;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  commercialScore: number;
  promise: string;
  readerAvatar: string;
  painPoint: string;
  finalBenefit: string;
  differentiator: string;
  competitionRisks: string;
  amazonPositioning: string;
  tableOfContents: string;
  correctionNotes: string;
  alerts: string[];
  ideas: Idea[];
  chapters: Chapter[];
  compliance: ComplianceItem[];
  packaging: PackagingData;
  paperback: PaperbackLayout;
};

export type GenerationKind =
  | "concept"
  | "outline"
  | "chapter"
  | "rewriteHuman"
  | "develop"
  | "simplify"
  | "examples"
  | "correction"
  | "packaging"
  | "keywords"
  | "coverBrief"
  | "compliance";

export type GenerationRequest = {
  kind: GenerationKind;
  project: BookProject;
  chapterId?: string;
};

export type GeneratedPayload = Partial<{
  ideas: Idea[];
  commercialScore: number;
  promise: string;
  readerAvatar: string;
  painPoint: string;
  finalBenefit: string;
  differentiator: string;
  competitionRisks: string;
  amazonPositioning: string;
  tableOfContents: string;
  chapters: Chapter[];
  chapterContent: string;
  manuscript: string[];
  correctionNotes: string;
  alerts: string[];
  compliance: ComplianceItem[];
  packaging: Partial<PackagingData>;
}>;

export type BookProjectSectionKey =
  | "overview"
  | "concept"
  | "outline"
  | "chapters"
  | "correction"
  | "packaging"
  | "export";
