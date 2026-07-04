"use client";

import { useMemo } from "react";
import { buildGamePlanReadRollup } from "@/lib/game-plan/game-plan-read-rollup";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { GamePlan } from "@/types/library-meta";

interface Props {
  plan: GamePlan;
}

export function GamePlanReadRollupPanel({ plan }: Props) {
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const plays = useOrganizerStore((s) => s.plays);

  const rollup = useMemo(
    () => buildGamePlanReadRollup(plan, practiceSessions, plays),
    [plan, practiceSessions, plays],
  );

  if (!rollup.playStats.length) return null;

  return (
    <section className="fc-game-plan-read-rollup" aria-label="Practice read rollup">
      <div className="fc-game-plan-read-rollup-head">
        <h3 className="fc-game-plan-read-rollup-title">Practice read results</h3>
        {rollup.overallRatePct !== null ? (
          <span className="fc-game-plan-read-rollup-rate">
            {rollup.overallRatePct}% landed
          </span>
        ) : (
          <span className="fc-game-plan-read-rollup-rate is-pending">
            Mark in Practice Live
          </span>
        )}
      </div>
      <p className="fc-game-plan-read-rollup-summary">
        {rollup.totalLanded} landed · {rollup.totalMissed} missed across plan
        plays
      </p>
      <ul className="fc-game-plan-read-rollup-list">
        {rollup.playStats.map((row) => {
          const marked = row.landed + row.missed;
          const rate =
            marked > 0 ? Math.round((row.landed / marked) * 100) : null;
          return (
            <li key={row.playId} className="fc-game-plan-read-rollup-row">
              <span className="fc-game-plan-read-rollup-play">{row.playTitle}</span>
              <span className="fc-game-plan-read-rollup-stats">
                {rate !== null ? `${rate}%` : "—"} · {row.landed}✓ {row.missed}✗
              </span>
              {row.calls.length ? (
                <span className="fc-game-plan-read-rollup-calls">
                  {row.calls.slice(0, 2).join(", ")}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
