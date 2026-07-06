import { NextResponse } from "next/server";
import { isOpenAiConfigured, getOpenAiApiKey } from "@/lib/ai/env";
import {
  buildDesignerCoachPrompt,
  parseDesignerCoachPayload,
  type DesignerCoachRequest,
} from "@/lib/designer/designer-coach-prompt";
import { emptyCoachingRecommendations } from "@/lib/film-room/film-coaching-format";
import type { DesignerFrame } from "@/types/designer";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 500_000;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function openAiErrorMessage(status: number, detail: string) {
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string; code?: string };
    };
    const message = parsed.error?.message?.trim();
    const code = parsed.error?.code;
    if (code === "insufficient_quota" || status === 429) {
      return "OpenAI quota exceeded.";
    }
    if (status === 401 || code === "invalid_api_key") {
      return "Invalid OpenAI API key.";
    }
    if (message) return message;
  } catch {
    /* fall through */
  }
  return "AI coaching failed. Try again.";
}

function isValidFrame(frame: unknown): frame is DesignerFrame {
  if (!frame || typeof frame !== "object") return false;
  const row = frame as DesignerFrame;
  return Array.isArray(row.objects) && Array.isArray(row.actions);
}

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return errorResponse(
      "AI coaching is not configured (OPENAI_API_KEY).",
      503,
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("Request too large.", 413);
  }

  let body: DesignerCoachRequest;
  try {
    body = (await request.json()) as DesignerCoachRequest;
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }

  if (!body?.play?.title || !isValidFrame(body.frame)) {
    return errorResponse("Invalid play snapshot.", 400);
  }

  const prompt = buildDesignerCoachPrompt(body);

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an expert basketball coach. Respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch {
    return errorResponse("Could not reach AI service.", 502);
  }

  const detail = await upstream.text();
  if (!upstream.ok) {
    return errorResponse(openAiErrorMessage(upstream.status, detail), 502);
  }

  let content = "";
  try {
    const parsed = JSON.parse(detail) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    content = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return errorResponse("Invalid AI response.", 502);
  }

  if (!content) {
    return errorResponse("Empty AI response.", 502);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    return errorResponse("Could not parse AI response.", 502);
  }

  const parsed = parseDesignerCoachPayload(
    payload,
    body.frame,
    body.libraryContext,
  );
  const coaching = parsed.coaching ?? emptyCoachingRecommendations();

  return NextResponse.json({
    ok: true,
    coaching,
    applyBundles: parsed.applyBundles,
    aiLibraryAlternatives: parsed.aiLibraryAlternatives,
  });
}
