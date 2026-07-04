"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  collectGamePlanFilmEvidence,
  type GamePlanFilmEvidenceItem,
} from "@/lib/film-room/film-game-plan-evidence";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { useFilmRoomStore } from "@/stores/film-room-store";
import type { GamePlan } from "@/types/library-meta";

interface Props {
  plan: GamePlan;
}

const SOURCE_LABELS: Record<GamePlanFilmEvidenceItem["source"], string> = {
  ref: "Scout clip",
  tendency: "Opponent board",
  timeout: "Timeout counter",
};

export function GamePlanFilmEvidencePanel({ plan }: Props) {
  const items = useMemo(() => collectGamePlanFilmEvidence(plan), [plan]);
  const filmSessions = useFilmRoomStore((s) => s.sessions);
  const filmHydrated = useFilmRoomStore((s) => s.hydrated);
  const loadFilmSessions = useFilmRoomStore((s) => s.load);

  useEffect(() => {
    if (!items.length || filmHydrated) return;
    void loadFilmSessions();
  }, [filmHydrated, items.length, loadFilmSessions]);

  const sessionTitles = useMemo(
    () => new Map(filmSessions.map((session) => [session.id, session.title])),
    [filmSessions],
  );

  if (!items.length) return null;

  return (
    <section className="fc-game-plan-film-evidence" aria-label="Film evidence">
      <div className="fc-game-plan-film-evidence-head">
        <h3 className="fc-game-plan-film-evidence-title">Film evidence</h3>
        <p className="fc-game-plan-film-evidence-sub">
          Clips linked from Film Room — open at the tagged timestamp.
        </p>
      </div>
      <ul className="fc-game-plan-film-evidence-list">
        {items.map((item) => {
          const sessionTitle = sessionTitles.get(item.sessionId);
          const href = buildFilmRoomDeepLink(item.sessionId, item.timestamp);
          return (
            <li key={item.id} className="fc-game-plan-film-evidence-row">
              <div className="fc-game-plan-film-evidence-main">
                <span className="fc-game-plan-film-evidence-badge">
                  {SOURCE_LABELS[item.source]}
                </span>
                <span className="fc-game-plan-film-evidence-time">
                  {item.timeLabel || "Clip"}
                </span>
                <span className="fc-game-plan-film-evidence-label">{item.title}</span>
                {sessionTitle ? (
                  <span className="fc-game-plan-film-evidence-session">
                    {sessionTitle}
                  </span>
                ) : null}
                {item.detail ? (
                  <span className="fc-game-plan-film-evidence-detail">{item.detail}</span>
                ) : null}
              </div>
              <Link
                className="fc-game-plan-film-evidence-open"
                href={href}
                title="Open clip in Film Room"
              >
                Watch clip ↗
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
