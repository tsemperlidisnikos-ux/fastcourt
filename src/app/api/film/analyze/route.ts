import { NextResponse } from "next/server";
import { isOpenAiConfigured, getOpenAiApiKey, getOpenAiVisionModel } from "@/lib/ai/env";
import {
  buildFilmClipAnalyzePrompt,
  parseFilmClipAnalysisPayload,
} from "@/lib/film-room/film-clip-analyze-prompt";
import { normalizeFilmAnalyzeEvents } from "@/lib/film-room/film-event-tags";
import { normalizeFilmAnalyzeFrameTimes } from "@/lib/film-room/film-analyze-context";
import { FILM_CLIP_ANALYZE_FRAME_MAX } from "@/lib/film-room/capture-video-frames";
import type {
  FilmClipAnalyzeErrorResponse,
  FilmClipAnalyzeRequest,
  FilmClipAnalyzeResponse,
} from "@/lib/film-room/film-clip-analyze-types";

export const runtime = "nodejs";

const MAX_FRAMES = FILM_CLIP_ANALYZE_FRAME_MAX;
const MAX_FRAME_CHARS = 900_000;
const MAX_BODY_BYTES = 10_000_000;

function errorResponse(
  error: string,
  status: number,
  code?: FilmClipAnalyzeErrorResponse["code"],
) {
  return NextResponse.json(
    { ok: false, error, code } satisfies FilmClipAnalyzeErrorResponse,
    { status },
  );
}

function openAiErrorMessage(status: number, detail: string) {
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const message = parsed.error?.message?.trim();
    const code = parsed.error?.code ?? parsed.error?.type;
    if (code === "insufficient_quota" || status === 429) {
      return "OpenAI quota exceeded. Add billing/credits at platform.openai.com, then try again.";
    }
    if (status === 401 || code === "invalid_api_key") {
      return "Invalid OpenAI API key. Check OPENAI_API_KEY in .env.local and restart the dev server.";
    }
    if (message) return message;
  } catch {
    /* fall through */
  }
  return "AI analysis failed. Try again.";
}

export async function POST(request: Request) {
  if (!isOpenAiConfigured()) {
    return errorResponse(
      "AI clip analysis is not configured on this server (OPENAI_API_KEY).",
      503,
      "not_configured",
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("Request too large.", 413, "invalid_request");
  }

  let body: FilmClipAnalyzeRequest;
  try {
    body = (await request.json()) as FilmClipAnalyzeRequest;
  } catch {
    return errorResponse("Invalid JSON body.", 400, "invalid_request");
  }

  const frames = Array.isArray(body.frames)
    ? body.frames.filter((row) => typeof row === "string" && row.length > 0)
    : [];
  if (!frames.length || frames.length > MAX_FRAMES) {
    return errorResponse(`Provide 1-${MAX_FRAMES} JPEG frames.`, 400, "invalid_request");
  }
  if (frames.some((frame) => frame.length > MAX_FRAME_CHARS)) {
    return errorResponse("Frame payload too large.", 413, "invalid_request");
  }

  const timestamp =
    typeof body.timestamp === "number" && Number.isFinite(body.timestamp)
      ? Math.max(0, body.timestamp)
      : 0;
  const sessionTitle =
    typeof body.sessionTitle === "string" ? body.sessionTitle.slice(0, 200) : "";
  const filmEvents = normalizeFilmAnalyzeEvents(body.filmEvents);
  const frameTimes = normalizeFilmAnalyzeFrameTimes(
    body.frameTimes,
    timestamp,
    frames.length,
  );

  const prompt = buildFilmClipAnalyzePrompt(timestamp, sessionTitle, {
    filmEvents,
    frameCount: frames.length,
    frameTimes,
  });

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "low" } }
  > = [{ type: "text", text: prompt }];

  for (const frame of frames) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${frame}`,
        detail: "low",
      },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getOpenAiVisionModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content }],
      }),
    });
  } catch {
    return errorResponse("Could not reach AI service.", 502, "upstream");
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("[film/analyze] OpenAI error", upstream.status, detail.slice(0, 400));
    return errorResponse(openAiErrorMessage(upstream.status, detail), 502, "upstream");
  }

  const payload = (await upstream.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    return errorResponse("Empty AI response.", 502, "upstream");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    return errorResponse("Could not parse AI response.", 502, "upstream");
  }

  const result = parseFilmClipAnalysisPayload(parsedJson);
  if (!result) {
    return errorResponse("AI response was not usable.", 502, "upstream");
  }

  return NextResponse.json({
    ok: true,
    result,
  } satisfies FilmClipAnalyzeResponse);
}
