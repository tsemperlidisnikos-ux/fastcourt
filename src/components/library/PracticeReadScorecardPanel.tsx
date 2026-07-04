"use client";

import {
  buildPracticeReadScorecard,
  buildPracticeReadTrend,
  formatReadSuccessLine,
  type PracticeReadScorecard,
} from "@/lib/practice/read-success-scorecard";
import type { PracticeSession } from "@/types/library-meta";

interface Props {
  session: PracticeSession;
  allSessions?: PracticeSession[];
}

function RateBar({ scorecard }: { scorecard: PracticeReadScorecard }) {
  const marked = scorecard.landedCount + scorecard.missedCount;
  if (!marked) return null;
  const landedPct = Math.round((scorecard.landedCount / marked) * 100);
  return (
    <div className="practice-read-scorecard-bar" aria-hidden>
      <div
        className="practice-read-scorecard-bar-landed"
        style={{ width: `${landedPct}%` }}
      />
      <div
        className="practice-read-scorecard-bar-missed"
        style={{ width: `${100 - landedPct}%` }}
      />
    </div>
  );
}

export function PracticeReadScorecardPanel({ session, allSessions = [] }: Props) {
  const scorecard = buildPracticeReadScorecard(session);
  if (!scorecard.trackableCount) return null;

  const trend = buildPracticeReadTrend(
    allSessions.filter((row) => row.team === session.team || !session.team),
    5,
  );

  const markedTrend = trend.filter(
    (row) => row.landedCount + row.missedCount > 0,
  );

  return (
    <section className="practice-read-scorecard" aria-label="Read success scorecard">
      <div className="practice-read-scorecard-head">
        <h3 className="practice-read-scorecard-title">Read success (xP-lite)</h3>
        {scorecard.successRatePct !== null ? (
          <span className="practice-read-scorecard-rate">
            {scorecard.successRatePct}%
          </span>
        ) : (
          <span className="practice-read-scorecard-rate is-pending">—</span>
        )}
      </div>
      <p className="practice-read-scorecard-summary">
        {formatReadSuccessLine(scorecard)}
      </p>
      <RateBar scorecard={scorecard} />
      {scorecard.byCall.length ? (
        <ul className="practice-read-scorecard-calls">
          {scorecard.byCall.map((row) => (
            <li key={row.call} className="practice-read-scorecard-call-row">
              <span className="practice-read-scorecard-call-label">{row.call}</span>
              <span className="practice-read-scorecard-call-stats">
                {row.landed > 0 ? `${row.landed}✓` : null}
                {row.missed > 0 ? `${row.landed > 0 ? " · " : ""}${row.missed}✗` : null}
                {row.unmarked > 0
                  ? `${row.landed || row.missed ? " · " : ""}${row.unmarked}?`
                  : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {markedTrend.length > 1 ? (
        <div className="practice-read-scorecard-trend">
          <span className="practice-read-scorecard-trend-label">Recent sessions</span>
          <ul className="practice-read-scorecard-trend-list">
            {markedTrend.map((row) => (
              <li key={row.sessionId} className="practice-read-scorecard-trend-row">
                <span>{row.title || row.date}</span>
                <span>
                  {row.successRatePct !== null ? `${row.successRatePct}%` : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
