import OpenAI from "openai";
import { initialCompliance } from "@/lib/constants";
import { chapterPrompt } from "@/lib/prompts/chapter";
import { complianceChecklistPrompt } from "@/lib/prompts/compliance-checklist";
import { conceptPrompt } from "@/lib/prompts/concept";
import { correctionPrompt } from "@/lib/prompts/correction";
import { coverBriefPrompt } from "@/lib/prompts/cover-brief";
import { keywordPrompt } from "@/lib/prompts/keywords";
import { kdpDescriptionPrompt } from "@/lib/prompts/kdp-description";
import { outlinePrompt } from "@/lib/prompts/outline";
import { rewriteHumanPrompt } from "@/lib/prompts/rewrite-human";
import type { GeneratedPayload, GenerationRequest } from "@/lib/types";
import { uid } from "@/lib/utils";

let client: OpenAI | null = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    });
  }
  return client;
}

async function askModel(prompt: string) {
  const sdk = getClient();
  if (!sdk) return null;
  const response = await sdk.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Tu es un ghostwriter KDP rigoureux. Retourne toujours un JSON valide et concis."
      },
      { role: "user", content: prompt }
    ]
  });
  return response.choices[0]?.message?.content ?? null;
}

export async function generateBookAsset({
  kind,
  project,
  chapterId
}: GenerationRequest): Promise<GeneratedPayload> {
  const chapter = project.chapters.find((item) => item.id === chapterId);
  const prompt =
    kind === "concept"
      ? conceptPrompt(project)
      : kind === "outline"
        ? outlinePrompt(project)
        : kind === "chapter"
          ? chapterPrompt(project, chapter?.title ?? "Chapitre")
          : kind === "rewriteHuman"
            ? rewriteHumanPrompt(project)
            : kind === "develop"
              ? chapterPrompt(
                  project,
                  chapter?.title ?? "Chapitre",
                  "Developpe davantage avec profondeur, details et transitions."
                )
              : kind === "simplify"
                ? chapterPrompt(
                    project,
                    chapter?.title ?? "Chapitre",
                    "Simplifie le langage et rends le chapitre plus digeste."
                  )
                : kind === "examples"
                  ? chapterPrompt(
                      project,
                      chapter?.title ?? "Chapitre",
                      "Ajoute des exemples concrets, situations et mini etudes de cas."
                    )
                  : kind === "correction"
                    ? correctionPrompt(project)
                    : kind === "packaging"
                      ? kdpDescriptionPrompt(project)
                      : kind === "keywords"
                        ? keywordPrompt(project)
                        : kind === "coverBrief"
                          ? coverBriefPrompt(project)
                          : complianceChecklistPrompt(project);

  const raw = await askModel(prompt);
  if (raw) {
    try {
      return JSON.parse(raw) as GeneratedPayload;
    } catch {
      return fallbackGeneration({ kind, project, chapterId });
    }
  }
  return fallbackGeneration({ kind, project, chapterId });
}

function fallbackGeneration({
  kind,
  project,
  chapterId
}: GenerationRequest): GeneratedPayload {
  const chapter = project.chapters.find((item) => item.id === chapterId);

  if (kind === "concept") {
    return {
      commercialScore: Math.min(95, project.commercialScore + 8),
      promise: `Aider ${project.audience || "le lecteur"} a obtenir un resultat concret dans la niche ${project.niche}.`,
      readerAvatar: `${project.audience || "Lecteur cible"} qui veut une transformation rapide mais credible.`,
      painPoint: `Le lecteur se sent bloque dans ${project.niche} et cherche un cadre clair.`,
      finalBenefit: "Un resultat visible, applicable et rassurant.",
      differentiator: `Approche ${project.tone} avec structure orientee action et lisibilite Amazon.`,
      competitionRisks:
        "Marche potentiellement concurrentiel si la promesse reste trop generique ou trop proche des leaders de niche.",
      amazonPositioning: `Livre ${project.type} a promesse claire pour la niche ${project.niche}.`,
      ideas: Array.from({ length: 10 }, (_, index) => ({
        title: `${project.niche || "Niche"} - idee ${index + 1}`,
        subtitle: `Sous-titre oriente resultat ${index + 1}`,
        score: 70 + index,
        angle: `Angle differenciant ${index + 1} pour ${project.audience || "ce public"}.`
      }))
    };
  }

  if (kind === "outline") {
    const chapters = project.chapters.map((item, index) => ({
      ...item,
      id: item.id || uid("chapter"),
      title: `${index + 1}. ${project.niche || "Sujet"} - etape ${index + 1}`,
      summary: `Ce chapitre fait progresser le lecteur sur l'etape ${index + 1}.`,
      learningGoal: "Faire comprendre un principe puis le transformer en action.",
      emotionalShift: "Du doute vers la clarte."
    }));
    return {
      tableOfContents: chapters.map((item) => item.title).join("\n"),
      chapters
    };
  }

  if (kind === "chapter" || kind === "develop" || kind === "simplify" || kind === "examples") {
    return {
      chapterContent: [
        `${chapter?.title ?? "Chapitre"}`,
        "",
        `Le lecteur avance ici dans la promesse centrale du livre : ${project.promise || "obtenir un resultat concret"}.`,
        "",
        "Cette section combine explications, exemples simples et transitions orientees action.",
        "",
        kind === "develop"
          ? "Version developpee avec plus de profondeur, plus de contexte et une meilleure densite pedagogique."
          : kind === "simplify"
            ? "Version simplifiee avec un langage plus direct et des phrases plus courtes."
            : kind === "examples"
              ? "Version enrichie avec des exemples terrain, une situation type et une application immediate."
              : "Version de base du chapitre, prete a etre retravaillee."
      ].join("\n")
    };
  }

  if (kind === "rewriteHuman") {
    return {
      manuscript: project.chapters.map(
        (item) =>
          `${item.content}\n\nVoix retravaillee: phrases plus naturelles, transitions plus humaines, moins de rigidite.`
      )
    };
  }

  if (kind === "correction") {
    return {
      correctionNotes:
        "Correction V1: alleger certaines repetitions, varier les ouvertures de paragraphes, renforcer les transitions entre chapitres.",
      alerts: [
        "Verifier toute promesse absolue liee a la sante, a la finance ou au droit.",
        "Relire la coherence du niveau de ton entre introduction et conclusion."
      ]
    };
  }

  if (kind === "packaging") {
    return {
      packaging: {
        amazonDescription:
          "<p>Un guide clair et concret pour aider le lecteur a passer de la confusion a l'action dans un cadre simple, credible et structure.</p>",
        bullets: [
          "Promesse claire et orientee transformation",
          "Structure rapide a lire et a appliquer",
          "Chapitrage pense pour la progression",
          "Ton credible sans jargon inutile",
          "Exemples concrets et utilisables",
          "Approche premium mais accessible",
          "Parfait pour une audience Amazon ciblee"
        ],
        categories: ["Business & Money", "Self-Help"],
        seoTitle: project.title,
        seoSubtitle: project.promise || "Sous-titre optimise",
        authorBio:
          "Auteur oriente resultats, specialise dans la simplification d'idees complexes en livres utiles et actionnables.",
        coverHook: "Un resultat concret, une methode claire, une vraie transformation."
      }
    };
  }

  if (kind === "keywords") {
    return {
      packaging: {
        keywords: [
          project.niche,
          project.type,
          "amazon kdp",
          "livre pratique",
          "guide",
          project.audience
        ].filter(Boolean),
        categories: ["Business & Money", "Reference"]
      }
    };
  }

  if (kind === "coverBrief") {
    return {
      packaging: {
        coverHook: "Clarte immediate. Resultat visible. Promesse credible.",
        coverBrief:
          "Creer une couverture premium, lisible en miniature, avec un titre fort, peu d'elements, hierarchie nette, palette chaude et credible, aucune surcharge visuelle."
      }
    };
  }

  return {
    compliance: initialCompliance(),
    alerts: [
      "Declarer le contenu AI-generated ou AI-assisted selon l'usage reel.",
      "Preparer un fichier interieur separe du fichier couverture paperback."
    ]
  };
}
