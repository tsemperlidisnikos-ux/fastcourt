"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FilmRoomCoachingSections } from "@/components/film-room/FilmRoomCoachingSections";
import { GameDayCounterStrip } from "@/components/library/GameDayCounterStrip";
import { TimeoutOverlay } from "@/components/library/TimeoutOverlay";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  COUNTERS_DEMO_ANALYSIS,
  COUNTERS_DEMO_APPLY_SUMMARY,
  COUNTERS_DEMO_COACH_STATS,
  COUNTERS_DEMO_FLOW,
  COUNTERS_DEMO_MATCHED_DEFENSE,
  COUNTERS_DEMO_META,
  COUNTERS_DEMO_OFFENSE_READ,
  COUNTERS_DEMO_PREP_ITEMS,
  COUNTERS_DEMO_REQUIREMENTS,
  COUNTERS_DEMO_SLIDE_IDS,
  COUNTERS_DEMO_SLIDE_TITLES,
  COUNTERS_DEMO_TIMEOUT_CUES,
  type CountersDemoSlideId,
} from "@/lib/demo/counters-demo-data";
import { coachingCueKey } from "@/lib/film-room/film-coaching-format";
import type { TimeoutViewSlide } from "@/lib/game-plan/timeout-mode";
import "@/styles/fc-counters-demo.css";

interface Props {
  onClose: () => void;
}

function DemoFlowDiagram() {
  return (
    <ol className="fc-counters-demo-flow">
      {COUNTERS_DEMO_FLOW.map((row) => (
        <li key={row.step} className="fc-counters-demo-flow-step">
          <span className="fc-counters-demo-flow-num">{row.step}</span>
          <div>
            <strong>{row.title}</strong>
            <p>{row.detail}</p>
            <span className="fc-counters-demo-flow-module">{row.module}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DemoScoutingSlide() {
  return (
    <div className="fc-counters-demo-scenario">
      <div className="fc-counters-demo-scenario-head">
        <span className="fc-counters-demo-badge">Demo clip</span>
        <h3>{COUNTERS_DEMO_META.filmSessionTitle}</h3>
        <p>
          {COUNTERS_DEMO_META.gameLabel} · {COUNTERS_DEMO_META.filmClock}
        </p>
      </div>
      <div className="fc-counters-demo-video-placeholder" aria-hidden="true">
        <span className="fc-counters-demo-video-time">{COUNTERS_DEMO_META.filmTimestamp}</span>
        <p>{COUNTERS_DEMO_META.clipLabel}</p>
      </div>
      <div className="fc-counters-demo-tag-row">
        <span className="fc-counters-demo-tag-label">Coach tags</span>
        {COUNTERS_DEMO_META.coachTags.map((tag) => (
          <span key={tag} className="fc-counters-demo-tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="fc-counters-demo-tag-row">
        <span className="fc-counters-demo-tag-label">Disruption</span>
        <span className="fc-counters-demo-tag is-disruption">
          {COUNTERS_DEMO_META.disruptionTag}
        </span>
      </div>
      <p className="fc-counters-demo-note">
        In Scouting, press <strong>Analyze clip</strong> at this moment. AI reads{" "}
        {COUNTERS_DEMO_ANALYSIS.coaching.counters.length} counter options from the pattern +
        your tags.
      </p>
    </div>
  );
}

function DemoAnalyzeSlide() {
  const selectedKeys = useMemo(() => {
    const keys = new Set<string>();
    COUNTERS_DEMO_ANALYSIS.coaching.counters.forEach((_, index) => {
      keys.add(coachingCueKey("counters", index));
    });
    return keys;
  }, []);

  return (
    <div className="fc-counters-demo-analyze">
      <p className="fc-counters-demo-lead">{COUNTERS_DEMO_ANALYSIS.summary}</p>
      <div className="fc-counters-demo-patterns">
        {COUNTERS_DEMO_ANALYSIS.playPatterns.map((row) => (
          <span key={row.tag} className="fc-counters-demo-pattern">
            {row.tag} · {Math.round(row.confidence * 100)}%
          </span>
        ))}
      </div>
      <div className="fc-counters-demo-coaching-wrap">
        <FilmRoomCoachingSections
          coaching={COUNTERS_DEMO_ANALYSIS.coaching}
          selectedKeys={selectedKeys}
          onToggle={() => {}}
        />
      </div>
      {COUNTERS_DEMO_ANALYSIS.disruption?.detected ? (
        <aside className="fc-counters-demo-disruption">
          <h4>Disruption detected</h4>
          <p>{COUNTERS_DEMO_ANALYSIS.disruption.whatBroke}</p>
          <p>
            <strong>Suggested read:</strong> {COUNTERS_DEMO_ANALYSIS.disruption.suggestedRead}
          </p>
        </aside>
      ) : null}
    </div>
  );
}

function DemoApplySlide() {
  return (
    <div className="fc-counters-demo-apply">
      <p className="fc-counters-demo-lead">
        After you check counters and press <strong>Apply to game plan</strong>, FastCourt writes
        scout data to <em>{COUNTERS_DEMO_META.opponent}</em> plan:
      </p>
      <ul className="fc-counters-demo-apply-stats">
        <li>
          <strong>{COUNTERS_DEMO_APPLY_SUMMARY.timeoutCuesAdded}</strong> timeout cues
        </li>
        <li>
          <strong>{COUNTERS_DEMO_APPLY_SUMMARY.tendenciesAdded}</strong> opponent tendencies
        </li>
        <li>
          <strong>{COUNTERS_DEMO_APPLY_SUMMARY.filmRefsAdded}</strong> film evidence link
        </li>
        <li>
          <strong>{COUNTERS_DEMO_APPLY_SUMMARY.defensePlaysLinked}</strong> defense plays matched
        </li>
        <li>
          <strong>{COUNTERS_DEMO_APPLY_SUMMARY.offenseReadLinked}</strong> offense read frame
        </li>
      </ul>
      <h4>Matched defense from library (demo)</h4>
      <ul className="fc-counters-demo-match-list">
        {COUNTERS_DEMO_MATCHED_DEFENSE.map((row) => (
          <li key={row.title}>
            <span>{row.title}</span>
            <span className="fc-counters-demo-match-tags">{row.tags.join(" · ")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DemoOffenseReadsSlide() {
  const read = COUNTERS_DEMO_OFFENSE_READ;
  return (
    <div className="fc-counters-demo-offense-read">
      <p className="fc-counters-demo-lead">
        When the opponent runs a counter against <em>your</em> action, link an offense read frame
        to the game plan. At timeout you show the read, not just the defensive call.
      </p>
      <div className="fc-counters-demo-read-card">
        <div className="fc-counters-demo-read-head">
          <span className="fc-counters-demo-read-coverage">{read.coverageLabel}</span>
          <span className="fc-counters-demo-read-pattern">vs {read.pattern}</span>
        </div>
        <h4>{read.readLabel}</h4>
        <p>{read.readDetail}</p>
        <p className="fc-counters-demo-read-library">
          Library match: <strong>{read.libraryMatch}</strong>
        </p>
        <p className="fc-counters-demo-read-practice">
          Practice: {read.landed} landed · {read.missed} missed ({read.practiceSuccessPct}%)
        </p>
      </div>
    </div>
  );
}

function DemoPracticeLoopSlide() {
  return (
    <div className="fc-counters-demo-practice">
      <p className="fc-counters-demo-lead">
        Weak reads auto-suggest prep blocks. Coach dashboard rolls up Practice Live outcomes with
        film disruption tags.
      </p>
      <div className="fc-counters-demo-coach-stat">
        <span className="fc-counters-demo-coach-pct">
          {COUNTERS_DEMO_COACH_STATS.overallReadRatePct}%
        </span>
        <span>
          read success · {COUNTERS_DEMO_COACH_STATS.totalLanded} landed ·{" "}
          {COUNTERS_DEMO_COACH_STATS.totalMissed} missed
        </span>
      </div>
      <h4>Prep read drills (demo)</h4>
      <ul className="fc-counters-demo-prep-list">
        {COUNTERS_DEMO_PREP_ITEMS.map((row) => (
          <li key={row.id}>
            <div>
              <strong>{row.call}</strong>
              <span className="fc-counters-demo-prep-coverage">{row.coverage}</span>
            </div>
            <p>{row.reason}</p>
            <span className="fc-counters-demo-prep-blocks">
              {row.blocks} block{row.blocks === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
      <p className="fc-counters-demo-note">
        {COUNTERS_DEMO_COACH_STATS.filmDisruptions} film disruption tags this month · weak reads:{" "}
        {COUNTERS_DEMO_COACH_STATS.weakReads.join(", ")}
      </p>
    </div>
  );
}

function DemoRequirementsSlide() {
  return (
    <ul className="fc-counters-demo-requirements">
      {COUNTERS_DEMO_REQUIREMENTS.map((row) => (
        <li key={row.id} className={row.required ? "is-required" : ""}>
          <div className="fc-counters-demo-req-head">
            <strong>{row.label}</strong>
            {row.required ? (
              <span className="fc-counters-demo-req-badge">Required</span>
            ) : (
              <span className="fc-counters-demo-req-badge optional">Recommended</span>
            )}
          </div>
          <p>{row.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function slideContent(id: CountersDemoSlideId, onOpenTimeout: () => void) {
  switch (id) {
    case "intro":
      return (
        <>
          <p className="fc-counters-demo-lead">
            Counters are defensive answers to opponent actions — scouted on film, saved to your
            game plan, and shown on the bench at timeout. This walkthrough uses fictional{" "}
            <strong>{COUNTERS_DEMO_META.opponent}</strong> data for{" "}
            <strong>{COUNTERS_DEMO_META.ourTeam}</strong>.
          </p>
          <DemoFlowDiagram />
        </>
      );
    case "scouting":
      return <DemoScoutingSlide />;
    case "analyze":
      return <DemoAnalyzeSlide />;
    case "apply":
      return <DemoApplySlide />;
    case "gameday":
      return (
        <>
          <p className="fc-counters-demo-lead">
            Top priority cues appear on the Game day bench card — same data staff see on the share
            link.
          </p>
          <GameDayCounterStrip cues={COUNTERS_DEMO_TIMEOUT_CUES} />
        </>
      );
    case "timeout":
      return (
        <>
          <p className="fc-counters-demo-lead">
            Timeout mode cycles counter slides first (BH / Big rules), then offensive read frames,
            then ATO / BLOB calls.
          </p>
          <GameDayCounterStrip cues={COUNTERS_DEMO_TIMEOUT_CUES} compact />
          <button type="button" className="fc-counters-demo-timeout-btn" onClick={onOpenTimeout}>
            Preview timeout slides
          </button>
        </>
      );
    case "offense-reads":
      return <DemoOffenseReadsSlide />;
    case "practice-loop":
      return <DemoPracticeLoopSlide />;
    case "requirements":
      return <DemoRequirementsSlide />;
    default:
      return null;
  }
}

export function CountersDemoOverlay({ onClose }: Props) {
  const mounted = useClientMounted();
  const [slideIndex, setSlideIndex] = useState(0);
  const [timeoutOpen, setTimeoutOpen] = useState(false);

  const slideId = COUNTERS_DEMO_SLIDE_IDS[slideIndex] ?? "intro";
  const slideTitle = COUNTERS_DEMO_SLIDE_TITLES[slideId];
  const isFirst = slideIndex === 0;
  const isLast = slideIndex >= COUNTERS_DEMO_SLIDE_IDS.length - 1;

  const timeoutSlides = useMemo<TimeoutViewSlide[]>(
    () => COUNTERS_DEMO_TIMEOUT_CUES.map((cue) => ({ kind: "counter", cue })),
    [],
  );

  const openTimeout = useCallback(() => setTimeoutOpen(true), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (timeoutOpen) setTimeoutOpen(false);
        else onClose();
        return;
      }
      if (timeoutOpen) return;
      if (e.key === "ArrowRight" && !isLast) {
        e.preventDefault();
        setSlideIndex((i) => Math.min(COUNTERS_DEMO_SLIDE_IDS.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        setSlideIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFirst, isLast, onClose, timeoutOpen]);

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="modal-overlay active fc-counters-demo-overlay"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="fc-counters-demo-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fc-counters-demo-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="fc-counters-demo-header">
            <div>
              <p className="fc-counters-demo-kicker">FastCourt demo · fictional data</p>
              <h2 id="fc-counters-demo-title">Counters walkthrough</h2>
              <p className="fc-counters-demo-sub">
                {COUNTERS_DEMO_META.ourTeam} vs {COUNTERS_DEMO_META.opponent}
              </p>
            </div>
            <button
              type="button"
              className="fc-counters-demo-close"
              aria-label="Close demo"
              onClick={onClose}
            >
              ✕
            </button>
          </header>

          <nav className="fc-counters-demo-nav" aria-label="Demo sections">
            {COUNTERS_DEMO_SLIDE_IDS.map((id, index) => (
              <button
                key={id}
                type="button"
                className={`fc-counters-demo-nav-btn${index === slideIndex ? " is-active" : ""}${index < slideIndex ? " is-done" : ""}`}
                onClick={() => setSlideIndex(index)}
                title={COUNTERS_DEMO_SLIDE_TITLES[id]}
              >
                <span className="fc-counters-demo-nav-num">{index + 1}</span>
                <span className="fc-counters-demo-nav-label">{COUNTERS_DEMO_SLIDE_TITLES[id]}</span>
              </button>
            ))}
          </nav>

          <div className="fc-counters-demo-body">
            <h3 className="fc-counters-demo-slide-title">{slideTitle}</h3>
            {slideContent(slideId, openTimeout)}
          </div>

          <footer className="fc-counters-demo-footer">
            <button
              type="button"
              className="fc-counters-demo-nav-action"
              disabled={isFirst}
              onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </button>
            <span className="fc-counters-demo-progress">
              {slideIndex + 1} / {COUNTERS_DEMO_SLIDE_IDS.length}
            </span>
            {isLast ? (
              <button type="button" className="fc-counters-demo-nav-action is-primary" onClick={onClose}>
                Done
              </button>
            ) : (
              <button
                type="button"
                className="fc-counters-demo-nav-action is-primary"
                onClick={() =>
                  setSlideIndex((i) => Math.min(COUNTERS_DEMO_SLIDE_IDS.length - 1, i + 1))
                }
              >
                Next
              </button>
            )}
          </footer>
        </div>
      </div>

      {timeoutOpen ? (
        <TimeoutOverlay
          slides={timeoutSlides}
          title={`${COUNTERS_DEMO_META.opponent} — demo timeout`}
          onClose={() => setTimeoutOpen(false)}
        />
      ) : null}
    </>,
    document.body,
  );
}
