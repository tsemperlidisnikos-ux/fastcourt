"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { VideoWatchButton } from "@/components/library/VideoWatchButton";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  formatPracticeLiveCall,
  resolvePracticeDisruptionCue,
} from "@/lib/practice/practice-disruption-cue";
import {
  getPracticeItemVideoUrl,
  isPracticeBlockRunnable,
  resolvePracticeSessionItems,
  type ResolvedPracticeRow,
} from "@/lib/practice/practice-items";
import {
  loadPracticeLivePrefs,
  savePracticeLivePrefs,
} from "@/lib/practice/live-prefs";
import { publishPracticeLiveState } from "@/lib/practice/live-broadcast";
import { playPracticeTimerAlert } from "@/lib/practice/timer-alert";
import {
  getTeamRoster,
  playerRosterDisplayName,
} from "@/lib/players/player-roster";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { PracticeSession } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

interface Props {
  session: PracticeSession;
  onClose: () => void;
}

function formatTime(totalSec: number) {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function blockTimerState(
  row: ResolvedPracticeRow | null,
  autoStartTimer: boolean,
) {
  const mins = Number(row?.item.durationMin) || 10;
  const total = Math.max(60, mins * 60);
  return {
    secondsTotal: total,
    secondsLeft: total,
    timerRunning: autoStartTimer,
  };
}

export function PracticeLiveOverlay({ session, onClose }: Props) {
  const plays = useOrganizerStore((s) => s.plays);
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const updatePracticeItem = useOrganizerStore((s) => s.updatePracticeItem);
  const mounted = useClientMounted();

  const playById = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const rows = useMemo(
    () =>
      resolvePracticeSessionItems(session, playById).filter(
        isPracticeBlockRunnable,
      ),
    [session, playById],
  );

  const bootTimer = blockTimerState(
    rows[0] ?? null,
    loadPracticeLivePrefs().autoStartTimer,
  );
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(bootTimer.secondsLeft);
  const [secondsTotal, setSecondsTotal] = useState(bootTimer.secondsTotal);
  const [timerRunning, setTimerRunning] = useState(bootTimer.timerRunning);
  const [sessionStart] = useState(() => Date.now());
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [planCollapsed, setPlanCollapsed] = useState(false);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const [autoStart, setAutoStart] = useState(
    () => loadPracticeLivePrefs().autoStartTimer,
  );
  const [timerSound, setTimerSound] = useState(
    () => loadPracticeLivePrefs().timerSound,
  );
  const timerFiredRef = useRef(-1);

  const current: ResolvedPracticeRow | null = rows[index] ?? null;

  useEffect(() => {
    const row = rows[index];
    let liveCall: string | undefined;
    if (row) {
      const cue = resolvePracticeDisruptionCue(row.item);
      liveCall = cue ? formatPracticeLiveCall(cue) ?? undefined : undefined;
    }
    publishPracticeLiveState({
      sessionId: session.id,
      currentIndex: index,
      completed: [...completed],
      liveCall,
    });
  }, [session.id, index, completed, rows]);

  useEffect(() => {
    if (mounted && rows.length === 0) {
      onClose();
    }
  }, [mounted, onClose, rows.length]);

  const goToBlock = useCallback(
    (nextIndex: number, autoStartTimer = loadPracticeLivePrefs().autoStartTimer) => {
      const clamped = Math.max(0, Math.min(rows.length - 1, nextIndex));
      const row = rows[clamped] ?? null;
      const timer = blockTimerState(row, autoStartTimer);
      setIndex(clamped);
      setSecondsTotal(timer.secondsTotal);
      setSecondsLeft(timer.secondsLeft);
      setTimerRunning(timer.timerRunning);
      timerFiredRef.current = -1;
    },
    [rows],
  );

  const restartBlockTimer = useCallback(
    (autoStartTimer = false) => {
      const timer = blockTimerState(current, autoStartTimer);
      setSecondsTotal(timer.secondsTotal);
      setSecondsLeft(timer.secondsLeft);
      setTimerRunning(timer.timerRunning);
      timerFiredRef.current = -1;
    },
    [current],
  );

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft > 0 || timerFiredRef.current === index) return;
    timerFiredRef.current = index;
    setTimerRunning(false);
    if (timerSound) playPracticeTimerAlert();
    setCompleted((prev) => new Set(prev).add(index));
    if (index < rows.length - 1) {
      const id = window.setTimeout(() => goToBlock(index + 1), 1200);
      return () => window.clearTimeout(id);
    }
  }, [secondsLeft, index, rows.length, goToBlock, timerSound]);

  useEffect(() => {
    if (!mounted) return;
    let lock: WakeLockSentinel | null = null;
    async function keepScreenOn() {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        /* ignore — may require user gesture or unsupported browser */
      }
    }
    void keepScreenOn();
    return () => {
      void lock?.release();
    };
  }, [mounted]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSessionElapsed(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [sessionStart]);

  const markDoneAndNext = useCallback(() => {
    setCompleted((prev) => new Set(prev).add(index));
    if (index < rows.length - 1) goToBlock(index + 1);
  }, [goToBlock, index, rows.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (presentPlay) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setTimerRunning((r) => !r);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goToBlock(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goToBlock(index - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        markDoneAndNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToBlock, index, markDoneAndNext, onClose, presentPlay]);

  function handleGymNotes(value: string) {
    void updatePracticeSession(session.id, { liveNotes: value });
  }

  const setReadOutcome = useCallback(
    (
      outcome: "landed" | "missed" | undefined,
      playerId?: string | null,
    ) => {
      const row = rows[index];
      if (!row) return;
      const patch: {
        readOutcome?: "landed" | "missed";
        readPlayerId?: string;
      } = { readOutcome: outcome };
      if (playerId !== undefined) {
        patch.readPlayerId = playerId?.trim() || undefined;
      }
      void updatePracticeItem(session.id, row.item.id, patch);
    },
    [index, rows, session.id, updatePracticeItem],
  );

  const rosterPlayers = useMemo(
    () => getTeamRoster(session.team).players,
    [session.team],
  );

  if (!mounted || !rows.length || !current) return null;

  const { item, play } = current;
  const kind = play ? (play.type === "drill" ? "Drill" : "Play") : "Block";
  const blockName = play?.title || item.cueLabel || "Block";
  const disruptionCue = resolvePracticeDisruptionCue(item);
  const liveCall = disruptionCue ? formatPracticeLiveCall(disruptionCue) : null;
  const cue = disruptionCue ? null : (item.notes || "").trim();
  const liveFrameIndex =
    disruptionCue?.designerFrameIndex ??
    (play?.frames?.length ? 0 : undefined);
  const liveFrame =
    play?.frames?.[
      typeof liveFrameIndex === "number" && liveFrameIndex >= 0
        ? liveFrameIndex
        : 0
    ];
  const videoUrl = getPracticeItemVideoUrl(item, play);
  const doneCount = completed.size;
  const progressPct = rows.length
    ? Math.round((doneCount / rows.length) * 100)
    : 0;
  const timerPct =
    secondsTotal > 0
      ? Math.max(0, Math.min(100, (secondsLeft / secondsTotal) * 100))
      : 0;

  return createPortal(
    <>
      <div
        id="practice-live-overlay"
        className={`practice-live-overlay${planCollapsed ? " plan-collapsed" : ""}`}
      >
        <div className="practice-live-header">
          <div className="practice-live-header-left">
            <div id="practice-live-title" className="practice-live-title">
              {session.title || "Practice"}
            </div>
            <div id="practice-live-meta" className="practice-live-meta">
              Block {index + 1} / {rows.length}
            </div>
            <div id="practice-live-progress-text" className="practice-live-progress-text">
              {doneCount} done · {Math.max(0, rows.length - doneCount)} left
            </div>
            <div className="practice-live-progress-bar" aria-hidden="true">
              <div
                id="practice-live-progress-fill"
                className="practice-live-progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="practice-live-header-right">
            <button
              type="button"
              id="practice-live-toggle-plan"
              className="practice-live-toggle-plan"
              onClick={() => setPlanCollapsed((v) => !v)}
            >
              Plan
            </button>
            <div className="practice-live-session-clock">
              <span className="practice-live-clock-label">Session</span>
              <span id="practice-live-session-time">
                {formatTime(sessionElapsed)}
              </span>
            </div>
            <button
              type="button"
              id="practice-live-close"
              className="practice-live-close-btn"
              onClick={onClose}
            >
              Exit
            </button>
          </div>
        </div>

        {session.notes?.trim() ? (
          <div
            id="practice-live-session-notes-wrap"
            className="practice-live-session-notes-wrap"
          >
            <span className="practice-live-session-notes-label">Session focus</span>
            <div id="practice-live-session-notes" className="practice-live-session-notes">
              {session.notes}
            </div>
          </div>
        ) : null}

        <div className="practice-live-body">
          <aside className="practice-live-checklist-wrap">
            <div className="practice-live-checklist-head">Plan</div>
            <div className="practice-live-checklist" id="practice-live-checklist">
              {rows.map(({ item: rowItem, play: rowPlay }, rowIndex) => {
                const rowName = rowPlay?.title || rowItem.cueLabel || "Block";
                const rowKind = rowPlay
                  ? rowPlay.type === "drill"
                    ? "Drill"
                    : "Play"
                  : "Block";
                return (
                  <button
                    key={rowItem.id}
                    type="button"
                    className={`practice-live-check-item${rowIndex === index ? " is-current" : ""}${completed.has(rowIndex) ? " is-done" : ""}`}
                    onClick={() => goToBlock(rowIndex)}
                  >
                    <span className="practice-live-check-num">
                      {completed.has(rowIndex) ? "✓" : rowIndex + 1}
                    </span>
                    <span className="practice-live-check-name">{rowName}</span>
                    <span className="practice-live-check-dur">
                      {Number(rowItem.durationMin) || 0}′ · {rowKind}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="practice-live-main">
            <div className="practice-live-block-badge" id="practice-live-block-num">
              {index + 1}
            </div>
            <div className="practice-live-thumb-wrap" id="practice-live-thumb">
              {liveFrame ? (
                <CourtFrameThumbnail
                  frame={liveFrame}
                  courtType={play!.courtType}
                  size="lg"
                />
              ) : play?.frames?.[0] ? (
                <CourtFrameThumbnail
                  frame={play.frames[0]}
                  courtType={play.courtType}
                  size="lg"
                />
              ) : (
                <span className="practice-live-thumb-fallback">
                  {kind === "Block" ? "📋" : "🏀"}
                </span>
              )}
            </div>
            <h2 id="practice-live-block-name" className="practice-live-block-name">
              {blockName}
            </h2>
            <div id="practice-live-block-meta" className="practice-live-block-meta">
              {kind} · {Number(item.durationMin) || 0} min
              {play?.series ? ` · ${play.series}` : ""}
            </div>
            {liveCall ? (
              <div
                id="practice-live-disruption-call"
                className="practice-live-disruption-call"
              >
                <span className="practice-live-disruption-call-label">Call</span>
                <span className="practice-live-disruption-call-text">{liveCall}</span>
              </div>
            ) : null}
            {liveCall || item.designerFrameIndex !== undefined ? (
              <div
                className="practice-live-read-outcome"
                aria-label="Mark read outcome"
              >
                <span className="practice-live-read-outcome-label">Read result</span>
                <div className="practice-live-read-outcome-actions">
                  <button
                    type="button"
                    className={`practice-live-read-outcome-btn${item.readOutcome === "landed" ? " is-active is-landed" : ""}`}
                    onClick={() =>
                      setReadOutcome(
                        item.readOutcome === "landed" ? undefined : "landed",
                      )
                    }
                  >
                    Landed
                  </button>
                  <button
                    type="button"
                    className={`practice-live-read-outcome-btn${item.readOutcome === "missed" ? " is-active is-missed" : ""}`}
                    onClick={() =>
                      setReadOutcome(
                        item.readOutcome === "missed" ? undefined : "missed",
                      )
                    }
                  >
                    Missed
                  </button>
                </div>
                {rosterPlayers.length ? (
                  <label className="practice-live-read-player">
                    <span className="practice-live-read-outcome-label">Player</span>
                    <select
                      value={item.readPlayerId || ""}
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        void updatePracticeItem(session.id, item.id, {
                          readPlayerId: value || undefined,
                        });
                      }}
                    >
                      <option value="">— Select —</option>
                      {rosterPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {playerRosterDisplayName(player)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="practice-live-read-player-hint">
                    Add roster players to attribute reads.
                  </p>
                )}
              </div>
            ) : null}
            {disruptionCue?.broke ? (
              <p className="practice-live-disruption-context">
                <strong>Broke:</strong> {disruptionCue.broke}
              </p>
            ) : null}
            {cue ? (
              <div id="practice-live-cue" className="practice-live-cue">
                {cue}
              </div>
            ) : disruptionCue?.filmRead && !liveCall ? (
              <div id="practice-live-cue" className="practice-live-cue">
                {disruptionCue.filmRead}
              </div>
            ) : null}

            <div className="practice-live-timer-panel">
              <div
                id="practice-live-timer-display"
                className={`practice-live-timer-display${secondsLeft <= 0 ? " is-done" : ""}`}
              >
                {formatTime(secondsLeft)}
              </div>
              <div className="practice-live-timer-bar">
                <div
                  id="practice-live-timer-fill"
                  className={`practice-live-timer-fill${secondsLeft <= 0 ? " is-done" : ""}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
              <div className="practice-live-timer-actions">
                <button
                  type="button"
                  id="practice-live-timer-minus"
                  className="practice-live-timer-btn practice-live-timer-btn-muted"
                  onClick={() =>
                    setSecondsLeft((s) => Math.max(0, s - 30))
                  }
                >
                  −30s
                </button>
                <button
                  type="button"
                  id="practice-live-timer-start"
                  className={`practice-live-timer-btn${timerRunning ? " is-running" : ""}`}
                  onClick={() => setTimerRunning((r) => !r)}
                >
                  {timerRunning ? "⏸ Pause" : "▶ Start"}
                </button>
                <button
                  type="button"
                  id="practice-live-timer-reset"
                  className="practice-live-timer-btn practice-live-timer-btn-muted"
                  onClick={() => restartBlockTimer(false)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  id="practice-live-timer-plus"
                  className="practice-live-timer-btn practice-live-timer-btn-muted"
                  onClick={() =>
                    setSecondsLeft((s) => {
                      const next = s + 30;
                      setSecondsTotal((t) => Math.max(t, next));
                      return next;
                    })
                  }
                >
                  +30s
                </button>
              </div>
              <label className="practice-live-auto-start">
                <input
                  type="checkbox"
                  id="practice-live-auto-start"
                  checked={autoStart}
                  onChange={(e) => {
                    setAutoStart(e.target.checked);
                    savePracticeLivePrefs({
                      autoStartTimer: e.target.checked,
                      timerSound,
                    });
                  }}
                />{" "}
                Auto-start timer on each block
              </label>
              <label className="practice-live-auto-start">
                <input
                  type="checkbox"
                  id="practice-live-timer-sound"
                  checked={timerSound}
                  onChange={(e) => {
                    setTimerSound(e.target.checked);
                    savePracticeLivePrefs({
                      autoStartTimer: autoStart,
                      timerSound: e.target.checked,
                    });
                  }}
                />{" "}
                Timer sound when block ends
              </label>
            </div>

            <div className="practice-live-actions">
              <button
                type="button"
                id="practice-live-prev"
                className="practice-live-nav-btn"
                disabled={index === 0}
                onClick={() => goToBlock(index - 1)}
              >
                ← Previous
              </button>
              <button
                type="button"
                id="practice-live-done"
                className="practice-live-done-btn"
                onClick={markDoneAndNext}
              >
                {index >= rows.length - 1 ? "✓ Finish session" : "✓ Done — Next"}
              </button>
              <button
                type="button"
                id="practice-live-view-diagram"
                className="practice-live-diagram-btn"
                disabled={!play?.frames?.length}
                onClick={() => play && setPresentPlay(play)}
              >
                View diagram
              </button>
              {videoUrl ? (
                <VideoWatchButton
                  videoUrl={videoUrl}
                  title={blockName}
                  id="practice-live-watch-video"
                  className="practice-live-video-btn"
                />
              ) : null}
              <button
                type="button"
                id="practice-live-next"
                className="practice-live-nav-btn"
                disabled={index >= rows.length - 1}
                onClick={() => goToBlock(index + 1)}
              >
                Next →
              </button>
            </div>

            <div className="practice-live-gym-notes-wrap">
              <label htmlFor="practice-live-gym-notes" className="practice-live-gym-notes-label">
                Gym notes (saved to session)
              </label>
              <textarea
                id="practice-live-gym-notes"
                className="practice-live-gym-notes"
                rows={3}
                defaultValue={session.liveNotes || ""}
                placeholder="Adjustments, focus points, what to repeat…"
                onChange={(e) => handleGymNotes(e.target.value)}
              />
            </div>
          </main>
        </div>

        <div className="practice-live-shortcuts">
          Space · timer &nbsp;|&nbsp; ← → · blocks &nbsp;|&nbsp; Enter · done &amp; next
        </div>
      </div>

      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
    </>,
    document.body,
  );
}
