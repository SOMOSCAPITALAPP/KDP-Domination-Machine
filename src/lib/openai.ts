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
              ? chapterPrompt(project, chapter?.title ?? "Chapitre", "Développe davantage avec profondeur, détails et transitions.")
              : kind === "simplify"
                ? chapterPrompt(project, chapter?.title ?? "Chapitre", "Simplifie le langage et rends le chapitre plus digeste.")
                : kind === "examples"
                  ? chapterPrompt(project, chapter?.title ?? "Chapitre", "Ajoute des exemples concrets, situations et mini études de cas.")
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
      promise: `Aider ${project.audience || "le lecteur"} à obtenir un résultat concret dans la niche ${project.niche}.`,
      readerAvatar: `${project.audience || "Lecteur ciblé"} qui veut une transformation rapide mais crédible.`,
      painPoint: `Le lecteur se sent bloqué dans ${project.niche} et cherche un cadre clair.`,
      finalBenefit: "Un résultat visible, applicable et rassurant.",
      differentiator: `Approche ${project.tone} avec structure orientée action et lisibilité Amazon.`,
      amazonPositioning: `Livre ${project.type} à promesse claire pour la niche ${project.niche}.`,
      ideas: Array.from({ length: 10 }, (_, index) => ({
        title: `${project.niche || "Niche"} - idée ${index + 1}`,
        subtitle: `Sous-titre orienté résultat ${index + 1}`,
        score: 70 + index,
        angle: `Angle différenciant ${index + 1} pour ${project.audience || "ce public"}.`
      }))
    };
  }

  if (kind === "outline") {
    const chapters = project.chapters.map((item, index) => ({
      ...item,
      id: item.id || uid("chapter"),
      title: `${index + 1}. ${project.niche || "Sujet"} - étape ${index + 1}`,
      summary: `Ce chapitre fait progresser le lecteur sur l'étape ${index + 1}.`,
      learningGoal: "Faire comprendre un principe puis le transformer en action.",
      emotionalShift: "Du doute vers la clarté."
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
        `Le lecteur avance ici dans la promesse centrale du livre : ${project.promise || "obtenir un résultat concret"}.`,
        "",
        "Cette section combine explications, exemples simples et transitions orientées action.",
        "",
        kind === "develop"
          ? "Version développée avec plus de profondeur, plus de contexte et une meilleure densité pédagogique."
          : kind === "simplify"
            ? "Version simplifiée avec un langage plus direct et des phrases plus courtes."
            : kind === "examples"
              ? "Version enrichie avec des exemples terrain, une situation type et une application immédiate."
              : "Version de base du chapitre, prête à être retravaillée."
      ].join("\n")
    };
  }

  if (kind === "rewriteHuman") {
    return {
      manuscript: project.chapters.map(
        (item) =>
          `${item.content}\n\nVoix retravaillée: phrases plus naturelles, transitions plus humaines, moins de rigidité.`
      )
    };
  }

  if (kind === "correction") {
    return {
      correctionNotes:
        "Correction V1: alléger certaines répétitions, varier les ouvertures de paragraphes, renforcer les transitions entre chapitres.",
      alerts: [
        "Vérifier toute promesse absolue liée à la santé, à la finance ou au droit.",
        "Relire la cohérence du niveau de ton entre introduction et conclusion."
      ]
    };
  }

  if (kind === "packaging") {
    return {
      packaging: {
        amazonDescription:
          "<p>Un guide clair et concret pour aider le lecteur à passer de la confusion à l'action dans un cadre simple, crédible et structuré.</p>",
        bullets: [
          "Promesse claire et orientée transformation",
          "Structure rapide à lire et à appliquer",
          "Chapitrage pensé pour la progression",
          "Ton crédible sans jargon inutile",
          "Exemples concrets et utilisables",
          "Approche premium mais accessible",
          "Parfait pour une audience Amazon ciblée"
        ],
        categories: ["Business & Money", "Self-Help"],
        seoTitle: project.title,
        seoSubtitle: project.promise || "Sous-titre optimisé",
        authorBio:
          "Auteur orienté résultats, spécialisé dans la simplification d'idées complexes en livres utiles et actionnables.",
        coverHook: "Un résultat concret, une méthode claire, une vraie transformation."
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
        coverHook: "Clarté immédiate. Résultat visible. Promesse crédible.",
        coverBrief:
          "Créer une couverture premium, lisible en miniature, avec un titre fort, peu d'éléments, hiérarchie nette, palette chaude et crédible, aucune surcharge visuelle."
      }
    };
  }

  return {
    compliance: initialCompliance(),
    alerts: [
      "Déclarer le contenu AI-generated ou AI-assisted selon l'usage réel.",
      "Préparer un fichier intérieur séparé du fichier couverture paperback."
    ]
  };
}

