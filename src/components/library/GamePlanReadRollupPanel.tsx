"use client";

import { useMemo } from "react";
import { buildGamePlanReadRollup } from "@/lib/game-plan/game-plan-read-rollup";
import { buildOpponentReadRollup } from "@/lib/game-plan/opponent-read-rollup";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { GamePlan } from "@/types/library-meta";

interface Props {
  plan: GamePlan;
}

export function GamePlanReadRollupPanel({ plan }: Props) {
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const plays = useOrganizerStore((s) => s.plays);

  const rollup = useMemo(
    () => buildGamePlanReadRollup(plan, practiceSessions, plays),
    [plan, practiceSessions, plays],
  );

  const opponentRollup = useMemo(
    () => buildOpponentReadRollup(plan, practiceSessions, gamePlans),
    [gamePlans, plan, practiceSessions],
  );

  const hasPlanStats = rollup.playStats.length > 0;
  const hasOpponentStats =
    opponentRollup.byCall.length > 0 || opponentRollup.overallRatePct !== null;

  if (!hasPlanStats && !hasOpponentStats) return null;

  return (
    <>
      {hasOpponentStats && plan.opponent?.trim() ? (
        <section
          className="fc-game-plan-read-rollup fc-game-plan-opponent-rollup"
          aria-label="Opponent read history"
        >
          <div className="fc-game-plan-read-rollup-head">
            <h3 className="fc-game-plan-read-rollup-title">
              vs {plan.opponent}
            </h3>
            {opponentRollup.overallRatePct !== null ? (
              <span className="fc-game-plan-read-rollup-rate">
                {opponentRollup.overallRatePct}% landed
              </span>
            ) : (
              <span className="fc-game-plan-read-rollup-rate is-pending">
                Mark in Practice Live
              </span>
            )}
          </div>
          <p className="fc-game-plan-read-rollup-summary">
            {opponentRollup.totalLanded} landed · {opponentRollup.totalMissed}{" "}
            missed · {opponentRollup.sessionCount} prep session
            {opponentRollup.sessionCount === 1 ? "" : "s"}
          </p>
          {opponentRollup.byCall.length ? (
            <ul className="fc-game-plan-read-rollup-list">
              {opponentRollup.byCall.slice(0, 6).map((row) => {
                const marked = row.landed + row.missed;
                const rate =
                  marked > 0 ? Math.round((row.landed / marked) * 100) : null;
                return (
                  <li key={row.call} className="fc-game-plan-read-rollup-row">
                    <span className="fc-game-plan-read-rollup-play">{row.call}</span>
                    <span className="fc-game-plan-read-rollup-stats">
                      {rate !== null ? `${rate}%` : "—"} · {row.landed}✓ {row.missed}✗
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      ) : null}

      {hasPlanStats ? (
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
      ) : null}
    </>
  );
}
