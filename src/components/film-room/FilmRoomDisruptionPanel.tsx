"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import { detectFilmDisruption } from "@/lib/film-room/film-disruption-detector";
import { comparePlayIdealToDisruption } from "@/lib/film-room/film-play-ideal-compare";
import {
  buildDisruptionPracticeEntries,
  disruptionPracticeSessionTitle,
} from "@/lib/film-room/film-practice-disruption";
import {
  buildHomeworkReadItemsFromEntries,
} from "@/lib/film-room/film-homework-disruption";
import { homeworkForGamePlan } from "@/lib/game-plan/player-homework";
import { suggestOffensePlaysForDisruption } from "@/lib/film-room/film-offense-variation-match";
import { appNotice } from "@/stores/dialog-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { FilmRoomDisruption } from "@/types/film-room";
import type { StoredPlay } from "@/types/library";

interface Props {
  analysis: FilmClipAnalysisResult;
  disruptionTags: FilmRoomDisruption[];
  plays?: StoredPlay[];
  sessionId?: string;
  sessionTitle?: string;
  timestamp?: number;
}

export function FilmRoomDisruptionPanel({
  analysis,
  disruptionTags,
  plays = [],
  sessionId,
  sessionTitle,
  timestamp,
}: Props) {
  const router = useRouter();
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const playerHomework = useOrganizerStore((s) => s.playerHomework);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const addDisruptionReadsToPractice = useOrganizerStore(
    (s) => s.addDisruptionReadsToPractice,
  );
  const addDisruptionReadsToHomework = useOrganizerStore(
    (s) => s.addDisruptionReadsToHomework,
  );
  const createDisruptionHomeworkFromGamePlan = useOrganizerStore(
    (s) => s.createDisruptionHomeworkFromGamePlan,
  );
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>("");
  const [practiceBusy, setPracticeBusy] = useState(false);
  const [homeworkBusy, setHomeworkBusy] = useState(false);
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

  const practiceEntries = useMemo(() => {
    if (!offenseMatches.length) return [];
    return buildDisruptionPracticeEntries(offenseMatches, assessment, analysis);
  }, [analysis, assessment, offenseMatches]);

  const homeworkReadItems = useMemo(() => {
    if (!practiceEntries.length) return [];
    return buildHomeworkReadItemsFromEntries(practiceEntries, {
      sessionId,
      timestamp,
    });
  }, [practiceEntries, sessionId, timestamp]);

  const planHomework = useMemo(() => {
    if (!selectedPlanId) return [];
    return homeworkForGamePlan(playerHomework, selectedPlanId);
  }, [playerHomework, selectedPlanId]);

  async function handleAddToPractice(createNew: boolean) {
    if (!practiceEntries.length) {
      appNotice("Practice", "No matching offense plays to add.");
      return;
    }
    setPracticeBusy(true);
    try {
      let sessionIdTarget = selectedSessionId;
      if (createNew || !sessionIdTarget) {
        const session = await createPracticeSession();
        await updatePracticeSession(session.id, {
          title: disruptionPracticeSessionTitle(sessionTitle ?? "Film reads"),
          notes: assessment.headline,
        });
        sessionIdTarget = session.id;
      }
      const added = await addDisruptionReadsToPractice(
        sessionIdTarget,
        practiceEntries,
      );
      appNotice(
        "Practice",
        added
          ? `Added ${added} read${added === 1 ? "" : "s"} to practice.`
          : "Those plays are already in the session.",
      );
      if (added) {
        router.push(`/library?tab=practice&session=${encodeURIComponent(sessionIdTarget)}`);
      }
    } finally {
      setPracticeBusy(false);
    }
  }

  async function handleAddToHomework(createNew: boolean) {
    if (!homeworkReadItems.length) {
      appNotice("Homework", "No matching offense plays to assign.");
      return;
    }
    if (!gamePlans.length) {
      appNotice("Homework", "Create a game plan first, then assign reads.");
      return;
    }
    setHomeworkBusy(true);
    try {
      const planId = selectedPlanId || gamePlans[0]?.id || "";
      if (!planId) return;

      if (createNew || !selectedHomeworkId) {
        const assignment = await createDisruptionHomeworkFromGamePlan(
          planId,
          homeworkReadItems,
          sessionTitle,
        );
        if (!assignment) {
          appNotice("Homework", "Could not create homework assignment.");
          return;
        }
        appNotice(
          "Homework",
          `Created homework with ${homeworkReadItems.length} read${homeworkReadItems.length === 1 ? "" : "s"}.`,
        );
        router.push(`/library?tab=gameplan&plan=${encodeURIComponent(planId)}`);
        return;
      }

      const added = await addDisruptionReadsToHomework(
        selectedHomeworkId,
        homeworkReadItems,
      );
      appNotice(
        "Homework",
        added
          ? `Added ${added} read${added === 1 ? "" : "s"} to homework.`
          : "Those reads are already in the assignment.",
      );
      if (added) {
        router.push(`/library?tab=gameplan&plan=${encodeURIComponent(planId)}`);
      }
    } finally {
      setHomeworkBusy(false);
    }
  }

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

      {practiceEntries.length ? (
        <div className="fc-film-disruption-practice">
          <h5 className="fc-film-disruption-reads-title">Practice planner</h5>
          {practiceSessions.length ? (
            <label className="fc-film-disruption-practice-select">
              <span>Session</span>
              <select
                value={selectedSessionId || practiceSessions[0]?.id || ""}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {practiceSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} ({session.date})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="fc-film-disruption-practice-actions">
            <button
              type="button"
              className="fc-film-disruption-practice-btn"
              disabled={practiceBusy}
              onClick={() => void handleAddToPractice(false)}
            >
              Add reads to practice
            </button>
            <button
              type="button"
              className="fc-film-disruption-practice-btn secondary"
              disabled={practiceBusy}
              onClick={() => void handleAddToPractice(true)}
            >
              New practice session
            </button>
          </div>
        </div>
      ) : null}

      {homeworkReadItems.length && gamePlans.length ? (
        <div className="fc-film-disruption-homework">
          <h5 className="fc-film-disruption-reads-title">Player homework</h5>
          <label className="fc-film-disruption-practice-select">
            <span>Game plan</span>
            <select
              value={selectedPlanId || gamePlans[0]?.id || ""}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                setSelectedHomeworkId("");
              }}
            >
              {gamePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title} vs {plan.opponent}
                </option>
              ))}
            </select>
          </label>
          {planHomework.length ? (
            <label className="fc-film-disruption-practice-select">
              <span>Assignment</span>
              <select
                value={selectedHomeworkId || planHomework[0]?.id || ""}
                onChange={(e) => setSelectedHomeworkId(e.target.value)}
              >
                {planHomework.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title} ({row.status})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="fc-film-disruption-practice-actions">
            <button
              type="button"
              className="fc-film-disruption-practice-btn"
              disabled={homeworkBusy}
              onClick={() => void handleAddToHomework(false)}
            >
              Add reads to homework
            </button>
            <button
              type="button"
              className="fc-film-disruption-practice-btn secondary"
              disabled={homeworkBusy}
              onClick={() => void handleAddToHomework(true)}
            >
              New homework
            </button>
          </div>
        </div>
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
