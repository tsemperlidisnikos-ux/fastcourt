"use client";

import Link from "next/link";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import type { PlayIdealCompareResult } from "@/lib/film-room/film-play-ideal-compare";
import type { StoredPlay } from "@/types/library";

interface Props {
  compare: PlayIdealCompareResult;
  play: StoredPlay;
  filmPreviewUrl?: string;
}

export function FilmRoomIdealCompareStrip({ compare, play, filmPreviewUrl }: Props) {
  const readFrame =
    play.frames[compare.readFrameIndex ?? compare.primaryFrameIndex] ??
    play.frames[compare.primaryFrameIndex] ??
    play.frames[0];
  const primaryFrame = play.frames[compare.primaryFrameIndex] ?? play.frames[0];

  if (!readFrame && !filmPreviewUrl) return null;

  return (
    <div
      className={`fc-film-ideal-compare${compare.aligned ? " is-aligned" : " is-mismatch"}`}
    >
      <h5 className="fc-film-ideal-compare-title">Ideal vs film</h5>
      <div className="fc-film-ideal-compare-grid">
        <figure className="fc-film-ideal-compare-cell">
          <figcaption className="fc-film-ideal-compare-label">Ideal read</figcaption>
          {readFrame ? (
            <Link
              href={buildDesignerHref(
                play.id,
                compare.readFrameIndex ?? compare.primaryFrameIndex,
              )}
              className="fc-film-ideal-compare-thumb"
              title="Open read frame in Designer"
            >
              <CourtFrameThumbnail
                frame={readFrame}
                courtType={play.courtType}
                size="sm"
              />
            </Link>
          ) : null}
          <span className="fc-film-ideal-compare-caption">{compare.expectedSummary}</span>
        </figure>
        <figure className="fc-film-ideal-compare-cell">
          <figcaption className="fc-film-ideal-compare-label">Film</figcaption>
          {filmPreviewUrl ? (
            <div className="fc-film-ideal-compare-film-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={filmPreviewUrl} alt="Captured film frame" />
            </div>
          ) : (
            <span className="fc-film-ideal-compare-film-missing">Run Analyze for film frame</span>
          )}
          {compare.actualPattern ? (
            <span className="fc-film-ideal-compare-caption">
              Film: {compare.actualPattern}
              {compare.actualCoverage ? ` · ${compare.actualCoverage.toUpperCase()}` : ""}
            </span>
          ) : null}
        </figure>
      </div>
      {!compare.aligned && compare.mismatchNote ? (
        <p className="fc-film-ideal-compare-gap">{compare.mismatchNote}</p>
      ) : null}
      {primaryFrame && compare.readFrameIndex !== undefined ? (
        <div className="fc-film-ideal-compare-links">
          <Link
            href={buildDesignerHref(play.id, compare.primaryFrameIndex)}
            className="fc-film-disruption-frame-link"
          >
            Primary frame
          </Link>
          <Link
            href={buildDesignerHref(play.id, compare.readFrameIndex)}
            className="fc-film-disruption-frame-link is-read"
          >
            Read frame
          </Link>
        </div>
      ) : null}
    </div>
  );
}
