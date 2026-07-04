"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildCoachDashboardModel,
  coachTrendBarHeight,
} from "@/lib/coach/coach-dashboard";
import { createDrillPracticeItems } from "@/lib/practice/drill-suggestions";
import { useFilmRoomStore } from "@/stores/film-room-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appNotice } from "@/stores/dialog-store";

export function CoachDashboardView() {
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const appendPracticeItems = useOrganizerStore((s) => s.appendPracticeItems);
  const filmSessions = useFilmRoomStore((s) => s.sessions);
  const filmHydrated = useFilmRoomStore((s) => s.hydrated);
  const loadFilmSessions = useFilmRoomStore((s) => s.load);

  useEffect(() => {
    if (!filmHydrated) void loadFilmSessions();
  }, [filmHydrated, loadFilmSessions]);

  const [teamFilter, setTeamFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const model = useMemo(
    () =>
      buildCoachDashboardModel({
        practiceSessions,
        filmSessions,
        plays,
        origin: typeof window !== "undefined" ? window.location.origin : "",
        teamFilter: teamFilter || undefined,
      }),
    [practiceSessions, filmSessions, plays, teamFilter],
  );

  const markedTrend = model.practiceTrend.filter(
    (row) => row.landedCount + row.missedCount > 0,
  );

  async function applyDrillSuggestion(suggestionId: string) {
    const suggestion = model.drillSuggestions.find((row) => row.id === suggestionId);
    if (!suggestion) return;
    setBusyId(suggestionId);
    try {
      const session = await createPracticeSession();
      const items = createDrillPracticeItems(suggestion);
      const added = await appendPracticeItems(session.id, items);
      await useOrganizerStore.getState().updatePracticeSession(session.id, {
        title: `Drill — ${suggestion.call}`,
        notes: suggestion.reason,
      });
      appNotice(
        "Drill blocks added",
        `Added ${added} block${added === 1 ? "" : "s"} to new practice session.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="coach-dashboard" id="coach-dashboard">
      <header className="coach-dashboard-head">
        <div>
          <h2 className="coach-dashboard-title">Coach dashboard</h2>
          <p className="coach-dashboard-sub">
            Film disruption reads + practice outcomes in one place (Copilot Step 8–9).
          </p>
        </div>
        {teams.length > 1 ? (
          <label className="coach-dashboard-team-filter">
            <span>Team</span>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
            >
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      <div className="coach-dashboard-grid">
        <section className="coach-dashboard-card coach-dashboard-read-rate">
          <h3>Practice read success</h3>
          {model.overallReadRatePct != null ? (
            <>
              <p className="coach-dashboard-big-stat">{model.overallReadRatePct}%</p>
              <p className="coach-dashboard-stat-meta">
                {model.totalLanded} landed · {model.totalMissed} missed
              </p>
            </>
          ) : (
            <p className="coach-dashboard-empty">
              Mark Landed / Missed in Practice Live to start tracking.
            </p>
          )}
          {markedTrend.length ? (
            <div className="coach-dashboard-trend" aria-label="Read success trend">
              {markedTrend.map((row) => (
                <div key={row.sessionId} className="coach-dashboard-trend-col">
                  <div
                    className="coach-dashboard-trend-bar"
                    style={{ height: `${coachTrendBarHeight(row.successRatePct)}%` }}
                    title={
                      row.successRatePct != null
                        ? `${row.successRatePct}%`
                        : "No marks yet"
                    }
                  />
                  <span className="coach-dashboard-trend-label">
                    {(row.title || row.date).slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="coach-dashboard-card coach-dashboard-film">
          <h3>Film evaluation</h3>
          {model.filmSessions.length ? (
            <ul className="coach-dashboard-film-list">
              {model.filmSessions.map((row) => (
                <li key={row.sessionId}>
                  <Link href={row.link.replace(/^https?:\/\/[^/]+/, "")}>
                    {row.title}
                  </Link>
                  <span>
                    {row.evaluation.disruptionDetectedCount}/
                    {row.evaluation.analyzedCount} disrupted
                    {row.evaluation.disruptionRatePct != null
                      ? ` · ${row.evaluation.disruptionRatePct}%`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="coach-dashboard-empty">
              Run Analyze clip or batch analyze in Film Room.
            </p>
          )}
        </section>

        <section className="coach-dashboard-card coach-dashboard-drills">
          <h3>Drill suggestions</h3>
          {model.drillSuggestions.length ? (
            <ul className="coach-dashboard-drill-list">
              {model.drillSuggestions.map((row) => (
                <li key={row.id} className="coach-dashboard-drill-row">
                  <div className="coach-dashboard-drill-main">
                    <strong>{row.call}</strong>
                    {row.playTitle ? (
                      <span className="coach-dashboard-drill-play">{row.playTitle}</span>
                    ) : null}
                    <p>{row.reason}</p>
                  </div>
                  <button
                    type="button"
                    className="coach-dashboard-drill-btn"
                    disabled={busyId === row.id}
                    onClick={() => void applyDrillSuggestion(row.id)}
                  >
                    {busyId === row.id
                      ? "Adding…"
                      : `Add ${row.suggestedBlocks} block${row.suggestedBlocks === 1 ? "" : "s"}`}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="coach-dashboard-empty">
              Needs 2+ missed reads at 40%+ miss rate across recent sessions.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
