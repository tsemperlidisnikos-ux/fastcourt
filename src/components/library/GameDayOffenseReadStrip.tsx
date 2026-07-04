"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import { opponentScopedSessionsForReadLookup } from "@/lib/game-plan/opponent-read-rollup";
import { buildTimeoutReadSlides } from "@/lib/game-plan/timeout-mode";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import {
  buildReadSuccessLookup,
  formatReadSuccessBadge,
  lookupReadSuccessPct,
} from "@/lib/practice/read-success-by-call";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { GamePlan } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

interface Props {
  plan: GamePlan;
  plays: StoredPlay[];
  limit?: number;
}

export function GameDayOffenseReadStrip({ plan, plays, limit = 3 }: Props) {
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const playMap = useMemo(() => new Map(plays.map((play) => [play.id, play])), [plays]);
  const reads = useMemo(
    () => buildTimeoutReadSlides(plan, playMap).slice(0, limit),
    [plan, playMap, limit],
  );

  const readSuccessLookup = useMemo(() => {
    const scoped = opponentScopedSessionsForReadLookup(
      plan,
      practiceSessions,
      gamePlans,
    );
    return buildReadSuccessLookup(scoped);
  }, [gamePlans, plan, practiceSessions]);

  if (!reads.length) return null;

  return (
    <section className="fc-game-day-reads" aria-label="Offense reads from film">
      <h2 className="fc-game-day-reads-title">Offense reads</h2>
      <ul className="fc-game-day-read-list">
        {reads.map((read) => {
          const frame = read.play.frames[read.frameIndex] ?? read.play.frames[0];
          const filmHref =
            read.filmSessionId != null
              ? buildFilmRoomDeepLink(read.filmSessionId, read.filmTimestamp)
              : null;
          const successPct = lookupReadSuccessPct(
            readSuccessLookup,
            read.callLabel,
            read.play.id,
          );
          const successBadge = formatReadSuccessBadge(successPct);
          return (
            <li
              key={`${read.play.id}-${read.frameIndex}`}
              className="fc-game-day-read-card"
            >
              <div className="fc-game-day-read-thumb">
                {frame ? (
                  <CourtFrameThumbnail
                    frame={frame}
                    courtType={read.play.courtType}
                    size="sm"
                  />
                ) : (
                  <span>🏀</span>
                )}
              </div>
              <div className="fc-game-day-read-main">
                <span className="fc-game-day-read-call">
                  {read.callLabel}
                  {successBadge ? (
                    <span className="fc-game-day-read-success" title="Practice success rate">
                      {successBadge}
                    </span>
                  ) : null}
                </span>
                <span className="fc-game-day-read-play">{read.play.title}</span>
                {read.detail ? (
                  <span className="fc-game-day-read-detail">{read.detail}</span>
                ) : null}
                <div className="fc-game-day-read-actions">
                  <Link
                    className="fc-game-day-read-link"
                    href={buildDesignerHref(read.play.id, read.frameIndex)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read frame ↗
                  </Link>
                  {filmHref ? (
                    <Link
                      className="fc-game-day-read-link is-film"
                      href={filmHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Film ↗
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
