"use client";

import {
  formatTimeoutCueBenchLine,
  pickTopTimeoutCues,
  timeoutCueCoverageLabel,
} from "@/lib/game-plan/game-day-timeout-cues";
import type { GamePlanTimeoutCue } from "@/types/library-meta";

interface Props {
  cues: GamePlanTimeoutCue[] | undefined;
  limit?: number;
  compact?: boolean;
}

export function GameDayCounterStrip({ cues, limit = 3, compact = false }: Props) {
  const top = pickTopTimeoutCues(cues, limit);
  if (!top.length) return null;

  return (
    <section className="fc-game-day-counters" aria-label="Counter calls">
      <h2 className="fc-game-day-counters-title">Counter calls</h2>
      <ul className="fc-game-day-counter-list">
        {top.map((cue) => (
          <li key={cue.id} className="fc-game-day-counter-card">
            <div className="fc-game-day-counter-head">
              <span className="fc-game-day-counter-coverage">
                {timeoutCueCoverageLabel(cue.coverage)}
              </span>
              {cue.targetsPattern ? (
                <span className="fc-game-day-counter-pattern">vs {cue.targetsPattern}</span>
              ) : null}
              {cue.priority === "high" ? (
                <span className="fc-game-day-counter-priority">Priority</span>
              ) : null}
            </div>
            <h3 className="fc-game-day-counter-name">{cue.title}</h3>
            {!compact ? (
              <>
                <p className="fc-game-day-counter-detail">{cue.detail}</p>
                {cue.ballHandlerRule || cue.screenerRule ? (
                  <div className="fc-game-day-counter-rules">
                    {cue.ballHandlerRule ? (
                      <span>
                        <strong>BH</strong> {cue.ballHandlerRule}
                      </span>
                    ) : null}
                    {cue.screenerRule ? (
                      <span>
                        <strong>Big</strong> {cue.screenerRule}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="fc-game-day-counter-detail">{formatTimeoutCueBenchLine(cue)}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
