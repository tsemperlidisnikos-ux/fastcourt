"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import { detectFilmDisruption } from "@/lib/film-room/film-disruption-detector";
import { comparePlayIdealToDisruption } from "@/lib/film-room/film-play-ideal-compare";
import { suggestOffensePlaysForDisruption } from "@/lib/film-room/film-offense-variation-match";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { FilmRoomDisruption } from "@/types/film-room";
import type { StoredPlay } from "@/types/library";

interface Props {
  analysis: FilmClipAnalysisResult;
  disruptionTags: FilmRoomDisruption[];
  plays?: StoredPlay[];
  sessionId?: string;
  timestamp?: number;
}

export function FilmRoomDisruptionPanel({
  analysis,
  disruptionTags,
  plays = [],
  sessionId,
  timestamp,
}: Props) {
  const assessment = useMemo(
    () =>
      detectFilmDisruption({
        disruptionTags,
        playPatterns: analysis.playPatterns,
        counters: analysis.coaching.counters,
        aiDisruption: analysis.disruption,
        aiSummary: analysis.summary,
      }),
    [analysis, disruptionTags],
  );

  const offenseMatches = useMemo(() => {
    if (!assessment.suggestedReads.length || !plays.length) return [];
    return suggestOffensePlaysForDisruption(
      plays,
      assessment.suggestedReads,
      new Set(),
      assessment.pattern,
      2,
    );
  }, [assessment, plays]);

  const idealCompares = useMemo(() => {
    return offenseMatches.map((match) =>
      comparePlayIdealToDisruption(match.play, analysis),
    );
  }, [analysis, offenseMatches]);

  const showPanel =
    assessment.detected ||
    disruptionTags.length > 0 ||
    analysis.disruption?.detected;

  if (!showPanel) {
    return (
      <section className="fc-film-disruption-panel is-empty">
        <h4 className="fc-film-disruption-panel-title">Play disruption</h4>
        <p className="fc-film-disruption-panel-hint">
          Tag defensive reads (H hedge, W switch, I ICE…) or run Analyze — AI will
          report if the plan broke and suggest reads.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`fc-film-disruption-panel${assessment.detected ? " is-detected" : ""}`}
    >
      <div className="fc-film-disruption-panel-head">
        <h4 className="fc-film-disruption-panel-title">Play disrupted</h4>
        <span
          className={`fc-film-disruption-confidence fc-film-disruption-confidence-${assessment.confidence}`}
        >
          {assessment.confidence}
        </span>
      </div>
      <p className="fc-film-disruption-headline">{assessment.headline}</p>
      <p className="fc-film-disruption-reason">{assessment.reason}</p>

      {analysis.disruption?.detected ? (
        <div className="fc-film-disruption-ai-read">
          <h5 className="fc-film-disruption-reads-title">AI disruption read</h5>
          {analysis.disruption.whatBroke ? (
            <p className="fc-film-disruption-ai-what">
              <strong>Broke:</strong> {analysis.disruption.whatBroke}
            </p>
          ) : null}
          {analysis.disruption.suggestedRead ? (
            <p className="fc-film-disruption-ai-read-suggest">
              <strong>Read:</strong> {analysis.disruption.suggestedRead}
            </p>
          ) : null}
        </div>
      ) : null}

      {assessment.suggestedReads.length ? (
        <div className="fc-film-disruption-reads">
          <h5 className="fc-film-disruption-reads-title">Offensive reads</h5>
          <ul className="fc-film-disruption-reads-list">
            {assessment.suggestedReads.map((read) => (
              <li key={read.label} className="fc-film-disruption-read-item">
                <strong>{read.label}</strong>
                <span>{read.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {offenseMatches.length ? (
        <div className="fc-film-disruption-variations">
          <h5 className="fc-film-disruption-reads-title">Library variations</h5>
          <ul className="fc-film-disruption-variation-list">
            {offenseMatches.map((match, index) => {
              const compare = idealCompares[index];
              return (
                <li key={match.play.id} className="fc-film-disruption-variation-item">
                  <Link
                    href={buildDesignerHref(
                      match.play.id,
                      compare?.readFrameIndex ?? compare?.primaryFrameIndex,
                    )}
                    className="fc-film-disruption-variation-link"
                  >
                    {match.play.title}
                  </Link>
                  {match.readLabel ? (
                    <span className="fc-film-disruption-variation-read">
                      {match.readLabel}
                    </span>
                  ) : null}
                  {compare && !compare.aligned && compare.mismatchNote ? (
                    <span className="fc-film-disruption-ideal-gap">
                      {compare.expectedSummary}
                      {compare.actualPattern
                        ? ` · Film: ${compare.actualPattern}`
                        : ""}
                      {compare.actualCoverage
                        ? ` · ${compare.actualCoverage.toUpperCase()}`
                        : ""}
                      {" — "}
                      {compare.mismatchNote}
                    </span>
                  ) : null}
                  <div className="fc-film-disruption-frame-links">
                    <Link
                      href={buildDesignerHref(match.play.id, compare?.primaryFrameIndex ?? 0)}
                      className="fc-film-disruption-frame-link"
                    >
                      Primary frame
                    </Link>
                    {compare?.readFrameIndex !== undefined ? (
                      <Link
                        href={buildDesignerHref(match.play.id, compare.readFrameIndex)}
                        className="fc-film-disruption-frame-link is-read"
                      >
                        Read frame
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : assessment.suggestedReads.length ? (
        <p className="fc-film-disruption-no-match">
          Tag offense plays with read names (reject, slip, backdoor…) to match
          automatically.
        </p>
      ) : null}

      {sessionId && typeof timestamp === "number" ? (
        <p className="fc-film-disruption-film-ref">
          <Link
            href={`/film-room?session=${encodeURIComponent(sessionId)}&t=${Math.round(timestamp)}`}
          >
            Jump to clip
          </Link>
          {" · "}
          Use <strong>Plan broke here</strong> bookmark on timeline
        </p>
      ) : null}
    </section>
  );
}
