"use client";

import { useMemo } from "react";
import {
  buildPrepReadRecommendations,
  collectPlanCoverages,
  countPrepReadBlocks,
} from "@/lib/game-plan/read-recommendations";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { GamePlan } from "@/types/library-meta";

interface Props {
  plan: GamePlan;
}

export function GamePlanReadRecommendationsPanel({ plan }: Props) {
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const plays = useOrganizerStore((s) => s.plays);

  const recommendations = useMemo(
    () =>
      buildPrepReadRecommendations(
        plan,
        practiceSessions,
        plays,
        gamePlans,
      ),
    [gamePlans, plan, plays, practiceSessions],
  );

  const coverages = useMemo(() => collectPlanCoverages(plan), [plan]);
  const blockCount = countPrepReadBlocks(recommendations);

  if (!recommendations.length) return null;

  return (
    <section
      className="fc-game-plan-read-rollup fc-game-plan-read-recommendations"
      aria-label="Prep read recommendations"
    >
      <div className="fc-game-plan-read-rollup-head">
        <h3 className="fc-game-plan-read-rollup-title">Prep read drills</h3>
        <span className="fc-game-plan-read-rollup-rate">
          {blockCount} block{blockCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="fc-game-plan-read-rollup-summary">
        Weak reads auto-added when you create Prep practice.
        {coverages.length
          ? ` Coverage cues: ${coverages.join(", ")}.`
          : null}
      </p>
      <ul className="fc-game-plan-read-rollup-list">
        {recommendations.map((row) => (
          <li key={row.id} className="fc-game-plan-read-rollup-row">
            <span className="fc-game-plan-read-rollup-play">
              {row.call}
              {row.matchesCoverage ? (
                <span className="fc-game-plan-read-rec-coverage">coverage</span>
              ) : null}
            </span>
            <span className="fc-game-plan-read-rollup-stats">
              {row.missRatePct}% miss · {row.suggestedBlocks}×
            </span>
            <span className="fc-game-plan-read-rollup-calls">
              {row.source === "opponent-history" ? `vs ${plan.opponent}` : "team trend"}
              {row.playTitle ? ` · ${row.playTitle}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
