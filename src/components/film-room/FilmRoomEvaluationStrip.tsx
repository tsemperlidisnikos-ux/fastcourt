"use client";

import {
  buildFilmSessionEvaluation,
  formatFilmEvaluationLine,
} from "@/lib/film-room/film-read-evaluation";
import type { FilmRoomAnalysisRecord } from "@/types/film-room";

interface Props {
  analyses: FilmRoomAnalysisRecord[];
}

export function FilmRoomEvaluationStrip({ analyses }: Props) {
  const evaluation = buildFilmSessionEvaluation(analyses);
  if (!evaluation.analyzedCount) return null;

  const topCoverage = Object.entries(evaluation.coverageCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return (
    <section className="fc-film-evaluation" aria-label="Film evaluation summary">
      <div className="fc-film-evaluation-head">
        <h3 className="fc-film-evaluation-title">Evaluation (xP-lite)</h3>
        {evaluation.disruptionRatePct !== null ? (
          <span className="fc-film-evaluation-rate">
            {evaluation.disruptionRatePct}% disrupted
          </span>
        ) : null}
      </div>
      <p className="fc-film-evaluation-summary">
        {formatFilmEvaluationLine(evaluation)}
      </p>
      {topCoverage ? (
        <p className="fc-film-evaluation-coverage">
          Top coverage: <strong>{topCoverage[0].toUpperCase()}</strong> ×
          {topCoverage[1]}
        </p>
      ) : null}
      {evaluation.suggestedReads.length ? (
        <p className="fc-film-evaluation-reads">
          Reads: {evaluation.suggestedReads.slice(0, 4).join(", ")}
        </p>
      ) : null}
    </section>
  );
}
