import { NextResponse } from "next/server";
import { getOpenAiVisionModel, isOpenAiConfigured } from "@/lib/ai/env";
import type { FilmAnalyzeStatusResponse } from "@/lib/film-room/film-clip-analyze-types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: isOpenAiConfigured(),
    model: getOpenAiVisionModel(),
  } satisfies FilmAnalyzeStatusResponse);
}
