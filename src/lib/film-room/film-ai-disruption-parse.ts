import {
  normalizeCounterCoverage,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import { normalizeFilmDisruptionKind } from "@/lib/film-room/film-disruption-tags";
import type { FilmClipAiDisruption } from "@/lib/film-room/film-clip-analyze-types";

export function parseFilmClipAiDisruption(raw: unknown): FilmClipAiDisruption | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const body = raw as Record<string, unknown>;
  const detected = body.detected === true;
  if (!detected) {
    return { detected: false };
  }

  const coverageRaw = String(body.coverage ?? "").trim().toLowerCase();
  let coverage: CounterCoverageId | undefined;
  if (coverageRaw) {
    const normalized = normalizeCounterCoverage(coverageRaw);
    coverage = normalized !== "other" ? normalized : undefined;
  }
  if (!coverage) {
    const kind = normalizeFilmDisruptionKind(coverageRaw);
    if (kind) {
      const mapped = normalizeCounterCoverage(kind);
      coverage = mapped !== "other" ? mapped : undefined;
    }
  }

  const trim = (key: string, max = 240) => {
    const value = body[key];
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, max)
      : undefined;
  };

  const confidenceRaw = String(body.confidence ?? "").trim().toLowerCase();
  const confidence =
    confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low"
      ? confidenceRaw
      : undefined;

  return {
    detected: true,
    coverage,
    whatBroke: trim("whatBroke", 200),
    suggestedRead: trim("suggestedRead", 120),
    summary: trim("summary", 300),
    confidence,
  };
}
