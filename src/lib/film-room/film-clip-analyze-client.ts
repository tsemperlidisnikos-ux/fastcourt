import type {
  FilmAnalyzeStatusResponse,
  FilmClipAnalyzeErrorResponse,
  FilmClipAnalyzeRequest,
  FilmClipAnalyzeResponse,
} from "@/lib/film-room/film-clip-analyze-types";

export async function fetchFilmAnalyzeStatus(): Promise<FilmAnalyzeStatusResponse> {
  const response = await fetch("/api/film/analyze/status", {
    cache: "no-store",
  });
  const payload = (await response.json()) as FilmAnalyzeStatusResponse;
  if (!response.ok || !payload.ok) {
    return { ok: true, configured: false, model: "gpt-4o-mini" };
  }
  return payload;
}

export async function analyzeFilmClip(request: FilmClipAnalyzeRequest) {
  const response = await fetch("/api/film/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const payload = (await response.json()) as
    | FilmClipAnalyzeResponse
    | FilmClipAnalyzeErrorResponse;

  if (!response.ok || !payload.ok) {
    const message =
      !payload.ok && payload.error
        ? payload.error
        : "Could not analyze clip.";
    throw new Error(message);
  }

  const result = payload.result;
  return {
    ...result,
    playPatterns: result.playPatterns ?? [],
    disruption: result.disruption,
    coaching: result.coaching ?? {
      alternativeOptions: [],
      counters: [],
      defensiveAdjustments: [],
      spacingFixes: [],
      timingCorrections: [],
    },
  };
}
