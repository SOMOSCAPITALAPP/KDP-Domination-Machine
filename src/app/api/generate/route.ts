import { NextResponse } from "next/server";
import { generateBookAsset } from "@/lib/openai";
import type { GenerationRequest } from "@/lib/types";

function extractRetryAfterSeconds(message: string) {
  const match = message.match(/try again in\s+(\d+)s/i);
  if (!match) return null;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as GenerationRequest;

  try {
    const result = await generateBookAsset(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue de generation.";
    const retryAfterSeconds = extractRetryAfterSeconds(message);
    const status = message.includes("Rate limit") ? 429 : 500;

    return NextResponse.json(
      {
        error: message,
        retryAfterSeconds
      },
      { status }
    );
  }
}
