import {
  formatBatchSummaryLine,
  summarizeBatchAnalysis,
  type BatchDisruptionSummary,
} from "@/lib/film-room/film-batch-analyze";
import type { FilmRoomAnalysisRecord } from "@/types/film-room";

export interface FilmSessionEvaluation extends BatchDisruptionSummary {
  disruptionRatePct: number | null;
}

export function buildFilmSessionEvaluation(
  analyses: FilmRoomAnalysisRecord[],
): FilmSessionEvaluation {
  const summary = summarizeBatchAnalysis(analyses);
  const disruptionRatePct =
    summary.analyzedCount > 0
      ? Math.round(
          (summary.disruptionDetectedCount / summary.analyzedCount) * 100,
        )
      : null;
  return {
    ...summary,
    disruptionRatePct,
  };
}

export function formatFilmEvaluationLine(
  evaluation: FilmSessionEvaluation,
): string {
  if (!evaluation.analyzedCount) {
    return "No AI analyses yet — run Analyze clip or batch analyze.";
  }
  const base = formatBatchSummaryLine(evaluation);
  if (evaluation.disruptionRatePct !== null) {
    return `${base} · ${evaluation.disruptionRatePct}% with disruption reads`;
  }
  return base;
}
