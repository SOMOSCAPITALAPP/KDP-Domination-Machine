import { NextResponse } from "next/server";
import { generateBookAsset } from "@/lib/openai";
import type { GenerationRequest } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as GenerationRequest;

  try {
    const result = await generateBookAsset(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue de génération.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

