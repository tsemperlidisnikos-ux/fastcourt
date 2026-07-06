"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  analyzePlayLocally,
  type DesignerCoachAlternative,
  type DesignerCoachLinkedPlay,
  type DesignerCoachPlayContext,
} from "@/lib/designer/analyze-play-locally";
import {
  appendDesignerCoachingToNotes,
  formatDesignerCoachingForNotes,
} from "@/lib/designer/designer-coach-format";
import {
  previewSelectionForFixes,
  type DesignerCoachApplyBundle,
  type DesignerCoachFix,
} from "@/lib/designer/designer-coach-apply";
import { buildDesignerCoachSnapshot } from "@/lib/designer/designer-coach-prompt";
import {
  buildDesignerCoachGamePlanSnapshot,
  DESIGNER_COACH_GAME_PLAN_STORAGE_KEY,
  filterDesignerCoachGamePlans,
  formatDesignerCoachGamePlanChip,
  resolveDesignerCoachGamePlanId,
} from "@/lib/designer/designer-coach-game-plan";
import {
  buildDesignerCoachPrepReads,
  findPrepReadPracticeSession,
  formatPrepReadCoachNotes,
  prepReadMatchesCurrentPlay,
  prepReadPracticeSessionTitle,
} from "@/lib/designer/designer-coach-prep-reads";
import { createPrepReadPracticeItems } from "@/lib/game-plan/read-recommendations";
import { formatGamePlanDate } from "@/lib/game-plan/game-plan-items";
import { cloneFrameForImport } from "@/lib/designer/designer-coach-import-frame";
import {
  counterReadFrameLabel,
  resolveCounterDefensePlay,
  type CounterLoadMode,
} from "@/lib/designer/designer-coach-counter-load";
import {
  buildCoachAlternativesEmptyMessage,
  isDrillCoachContext,
} from "@/lib/designer/designer-coach-empty-states";
import {
  filterCoachFilmEvidence,
  formatCoachFilmEvidenceNotes,
  type DesignerCoachFilmEvidenceMatch,
} from "@/lib/designer/designer-coach-film-evidence";
import {
  buildDesignerCoachLibraryContext,
  mergeAiGroundedAlternatives,
} from "@/lib/designer/designer-coach-library-context";
import { ImportFrameModal } from "@/components/designer/ImportFrameModal";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { useFilmRoomStore } from "@/stores/film-room-store";
import { useClientMounted } from "@/hooks/useClientMounted";
import { createPortal } from "react-dom";
import { appConfirm, appNotice } from "@/stores/dialog-store";
import { useLibraryStore } from "@/stores/library-store";
import {
  COACHING_CATEGORY_LABELS,
  COACHING_CATEGORY_ORDER,
  coachingHasSuggestions,
} from "@/lib/film-room/film-coaching-format";
import {
  COUNTER_COVERAGE_LABELS,
  suggestDefensePlaysForCounter,
} from "@/lib/film-room/film-counter-playbook";
import type { PrepReadRecommendation } from "@/lib/game-plan/read-recommendations";
import type {
  FilmClipCoachingCategoryId,
  FilmClipCoachingRecommendations,
  FilmClipCounterSuggestion,
} from "@/lib/film-room/film-clip-analyze-types";
import { primaryFrameLabel } from "@/lib/designer/frame-read-branch";
import { useDesignerStore } from "@/stores/designer-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { DesignerFrame } from "@/types/designer";
import type { StoredPlay } from "@/types/library";

interface Props {
  play: DesignerCoachPlayContext;
  libraryPlays: StoredPlay[];
}

function mergeCoaching(
  local: FilmClipCoachingRecommendations,
  ai: FilmClipCoachingRecommendations,
): FilmClipCoachingRecommendations {
  return {
    alternativeOptions: ai.alternativeOptions.length
      ? ai.alternativeOptions
      : local.alternativeOptions,
    counters: ai.counters.length ? ai.counters : local.counters,
    defensiveAdjustments: ai.defensiveAdjustments.length
      ? ai.defensiveAdjustments
      : local.defensiveAdjustments,
    spacingFixes: ai.spacingFixes.length ? ai.spacingFixes : local.spacingFixes,
    timingCorrections: ai.timingCorrections.length
      ? ai.timingCorrections
      : local.timingCorrections,
  };
}

function mergeCoachBundles(
  local: DesignerCoachApplyBundle[],
  ai: DesignerCoachApplyBundle[],
): DesignerCoachApplyBundle[] {
  const merged = [...local];
  for (const bundle of ai) {
    if (
      merged.some(
        (row) => row.key === bundle.key || row.title === bundle.title,
      )
    ) {
      continue;
    }
    merged.push(bundle);
  }
  return merged;
}

function ApplyableBundleCard({
  bundle,
  previewFrame,
  previewActive,
  onAddNotes,
  onApply,
  onPreview,
}: {
  bundle: DesignerCoachApplyBundle;
  previewFrame?: DesignerFrame;
  previewActive?: boolean;
  onAddNotes: () => void;
  onApply: () => void;
  onPreview: () => void;
}) {
  const canApply = bundle.fixes.length > 0;
  const previewTarget = previewSelectionForFixes(bundle.fixes, previewFrame);
  const canPreview = Boolean(previewTarget.objectId || previewTarget.actionId);
  const canGhostPreview = canApply && bundle.fixes.some(
    (fix) =>
      fix.type === "move" ||
      fix.type === "addDefense" ||
      fix.type === "setDefenseStyle",
  );

  return (
    <article className="ds-coach-card">
      <div className="ds-coach-card-head">
        <h4 className="ds-coach-card-title">{bundle.title}</h4>
        {bundle.priority ? (
          <span className={`ds-coach-priority ds-coach-priority-${bundle.priority}`}>
            {bundle.priority}
          </span>
        ) : null}
      </div>
      <p className="ds-coach-card-detail">{bundle.detail}</p>
      <div className="ds-coach-card-actions">
        {canApply ? (
          <button
            type="button"
            className="ds-coach-card-action is-apply"
            onClick={onApply}
          >
            Apply on court
          </button>
        ) : null}
        {canGhostPreview ? (
          <button
            type="button"
            className={`ds-coach-card-action${previewActive ? " is-active" : ""}`}
            onClick={onPreview}
          >
            {previewActive ? "Hide preview" : "Preview"}
          </button>
        ) : canPreview ? (
          <button type="button" className="ds-coach-card-action" onClick={onPreview}>
            Highlight
          </button>
        ) : null}
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

function SuggestionCard({
  title,
  detail,
  priority,
  onAddNotes,
}: {
  title: string;
  detail: string;
  priority?: string;
  onAddNotes: () => void;
}) {
  return (
    <article className="ds-coach-card">
      <div className="ds-coach-card-head">
        <h4 className="ds-coach-card-title">{title}</h4>
        {priority ? (
          <span className={`ds-coach-priority ds-coach-priority-${priority}`}>
            {priority}
          </span>
        ) : null}
      </div>
      <p className="ds-coach-card-detail">{detail}</p>
      <div className="ds-coach-card-actions">
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

function AlternativeOptionCard({
  alternative,
  onImportFrame,
  onAddNotes,
}: {
  alternative: DesignerCoachAlternative;
  onImportFrame: () => void;
  onAddNotes: () => void;
}) {
  const isSamePlay = alternative.kind === "same-play";
  return (
    <article
      className={`ds-coach-card ds-coach-card-alternative${
        isSamePlay ? " is-same-play" : ""
      }`}
    >
      <div className="ds-coach-card-head">
        <h4 className="ds-coach-card-title">{alternative.title}</h4>
        <span className="ds-coach-prep-read-badge">
          {isSamePlay ? "This play" : `${alternative.scorePct}% match`}
        </span>
      </div>
      <p className="ds-coach-card-detail">{alternative.detail}</p>
      {isSamePlay ? (
        <div className="ds-coach-alt-link">
          <span className="ds-coach-link-play is-muted">{alternative.playTitle}</span>
        </div>
      ) : (
        <div className="ds-coach-alt-link">
          <Link
            href={`/designer?item=${encodeURIComponent(alternative.playId)}`}
            className="ds-coach-link-play"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {alternative.playTitle}
          </Link>
        </div>
      )}
      <div className="ds-coach-card-actions">
        <button
          type="button"
          className="ds-coach-card-action is-apply"
          onClick={onImportFrame}
        >
          {isSamePlay ? "Use frame" : "Import frame"}
        </button>
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

function PrepReadCard({
  recommendation,
  opponent,
  matchesCurrentPlay,
  onAddNotes,
  onAddToPractice,
  practiceBusy,
}: {
  recommendation: PrepReadRecommendation;
  opponent: string;
  matchesCurrentPlay: boolean;
  onAddNotes: () => void;
  onAddToPractice: () => void;
  practiceBusy: boolean;
}) {
  return (
    <article className="ds-coach-card ds-coach-card-prep-read">
      <div className="ds-coach-card-head">
        <h4 className="ds-coach-card-title">{recommendation.call}</h4>
        <span className="ds-coach-priority ds-coach-priority-high">
          {recommendation.missRatePct}% miss
        </span>
      </div>
      <p className="ds-coach-card-detail">{recommendation.reason}</p>
      <div className="ds-coach-prep-read-meta">
        {recommendation.matchesCoverage ? (
          <span className="ds-coach-prep-read-badge">Coverage match</span>
        ) : null}
        {matchesCurrentPlay ? (
          <span className="ds-coach-prep-read-badge is-current">This play</span>
        ) : null}
        <span className="ds-coach-prep-read-stats">
          {recommendation.suggestedBlocks}× drill ·{" "}
          {recommendation.source === "opponent-history"
            ? `vs ${opponent}`
            : "team trend"}
        </span>
      </div>
      {recommendation.playId ? (
        <div className="ds-coach-alt-link">
          <Link
            href={`/designer?item=${encodeURIComponent(recommendation.playId)}`}
            className="ds-coach-link-play"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {recommendation.playTitle ?? "linked play"}
          </Link>
        </div>
      ) : null}
      <div className="ds-coach-card-actions">
        <button
          type="button"
          className="ds-coach-card-action is-apply"
          disabled={practiceBusy}
          onClick={onAddToPractice}
        >
          Add to practice
        </button>
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

function CounterLoadModeModal({
  open,
  counterTitle,
  playTitle,
  onClose,
  onSelect,
}: {
  open: boolean;
  counterTitle: string;
  playTitle: string;
  onClose: () => void;
  onSelect: (mode: CounterLoadMode) => void;
}) {
  const mounted = useClientMounted();
  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box modal-box-wide fc-add-play-modal-box ds-coach-counter-load-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-counter-load-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-title" id="coach-counter-load-title">
          Load counter on court
        </div>
        <p className="modal-subtitle">
          Import a frame from <strong>{playTitle}</strong> for{" "}
          <strong>{counterTitle}</strong>.
        </p>
        <div className="ds-coach-counter-load-options">
          <button
            type="button"
            className="ds-coach-counter-load-option"
            onClick={() => onSelect("replace")}
          >
            <strong>Replace current frame</strong>
            <span>Overwrite {counterTitle} on this frame — undo anytime.</span>
          </button>
          <button
            type="button"
            className="ds-coach-counter-load-option"
            onClick={() => onSelect("read")}
          >
            <strong>Add as read frame</strong>
            <span>Keep this frame and append a defensive read branch.</span>
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function FilmEvidenceCard({
  item,
  sessionTitle,
  opponent,
  onAddNotes,
}: {
  item: DesignerCoachFilmEvidenceMatch;
  sessionTitle?: string;
  opponent: string;
  onAddNotes: () => void;
}) {
  const href = buildFilmRoomDeepLink(item.sessionId, item.timestamp);
  return (
    <article className="ds-coach-card ds-coach-card-film">
      <div className="ds-coach-card-head">
        <h4 className="ds-coach-card-title">{item.title}</h4>
        <span className="ds-coach-prep-read-badge">
          {item.timeLabel || "Clip"}
        </span>
      </div>
      <p className="ds-coach-card-detail">
        {item.detail ?? item.matchReason}
        {sessionTitle ? ` · ${sessionTitle}` : ""}
      </p>
      <div className="ds-coach-prep-read-meta">
        <span className="ds-coach-prep-read-badge">{item.matchReason}</span>
        <span className="ds-coach-prep-read-stats">vs {opponent}</span>
      </div>
      <div className="ds-coach-card-actions">
        <Link
          href={href}
          className="ds-coach-card-action is-apply"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watch clip ↗
        </Link>
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

function CounterCard({
  counter,
  matchedPlays,
  onAddNotes,
  onLoadOnCourt,
  canLoadOnCourt,
}: {
  counter: FilmClipCounterSuggestion;
  matchedPlays: DesignerCoachLinkedPlay[];
  onAddNotes: () => void;
  onLoadOnCourt: () => void;
  canLoadOnCourt: boolean;
}) {
  return (
    <article className="ds-coach-card ds-coach-card-counter">
      <div className="ds-coach-card-head">
        <span className="ds-coach-counter-badge">
          {COUNTER_COVERAGE_LABELS[counter.coverage]}
        </span>
        {counter.targetsPattern ? (
          <span className="ds-coach-pattern">vs {counter.targetsPattern}</span>
        ) : null}
      </div>
      <h4 className="ds-coach-card-title">{counter.title}</h4>
      <p className="ds-coach-card-detail">{counter.detail}</p>
      {matchedPlays.length ? (
        <ul className="ds-coach-links">
          {matchedPlays.map((play) => (
            <li key={play.playId}>
              <Link
                href={`/designer?item=${encodeURIComponent(play.playId)}`}
                className="ds-coach-link-play"
                target="_blank"
                rel="noopener noreferrer"
              >
                {play.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="ds-coach-card-actions">
        {canLoadOnCourt ? (
          <button
            type="button"
            className="ds-coach-card-action is-apply"
            onClick={onLoadOnCourt}
          >
            Load on court
          </button>
        ) : null}
        <button type="button" className="ds-coach-card-action" onClick={onAddNotes}>
          Add to notes
        </button>
      </div>
    </article>
  );
}

export function DesignerCoachPanel({ play, libraryPlays }: Props) {
  const currentFrameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const setFrameNotes = useDesignerStore((s) => s.setFrameNotes);
  const applyCoachFixes = useDesignerStore((s) => s.applyCoachFixes);
  const setCoachPreviewFixes = useDesignerStore((s) => s.setCoachPreviewFixes);
  const clearCoachPreviewFixes = useDesignerStore((s) => s.clearCoachPreviewFixes);
  const coachPreviewFixes = useDesignerStore((s) => s.coachPreviewFixes);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const replaceCurrentFrame = useDesignerStore((s) => s.replaceCurrentFrame);
  const appendImportedReadFrame = useDesignerStore((s) => s.appendImportedReadFrame);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const libraryItems = useLibraryStore((s) => s.items);
  const getPlayDocument = useLibraryStore((s) => s.getPlayDocument);
  const practiceSessions = useOrganizerStore((s) => s.practiceSessions);
  const appendPracticeItems = useOrganizerStore((s) => s.appendPracticeItems);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const filmSessions = useFilmRoomStore((s) => s.sessions);
  const filmHydrated = useFilmRoomStore((s) => s.hydrated);
  const loadFilmSessions = useFilmRoomStore((s) => s.load);
  const organizerHydrated = useOrganizerStore((s) => s.hydrated);
  const frame = play.frames[currentFrameIndex];

  const eligibleGamePlans = useMemo(
    () => filterDesignerCoachGamePlans(gamePlans, play.team),
    [gamePlans, play.team],
  );

  const [selectedGamePlanId, setSelectedGamePlanId] = useState<string | null>(
    null,
  );
  const [gamePlanReady, setGamePlanReady] = useState(false);

  useEffect(() => {
    if (!organizerHydrated || gamePlanReady) return;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(DESIGNER_COACH_GAME_PLAN_STORAGE_KEY);
    } catch {
      stored = null;
    }
    setSelectedGamePlanId(
      resolveDesignerCoachGamePlanId(gamePlans, play.team, stored),
    );
    setGamePlanReady(true);
  }, [gamePlanReady, gamePlans, organizerHydrated, play.team]);

  const selectedGamePlan = useMemo(
    () => eligibleGamePlans.find((plan) => plan.id === selectedGamePlanId) ?? null,
    [eligibleGamePlans, selectedGamePlanId],
  );

  const gamePlanSnapshot = useMemo(
    () =>
      selectedGamePlan
        ? buildDesignerCoachGamePlanSnapshot(selectedGamePlan)
        : undefined,
    [selectedGamePlan],
  );

  const prepReads = useMemo(() => {
    if (!selectedGamePlan || !organizerHydrated) return [];
    return buildDesignerCoachPrepReads(
      selectedGamePlan,
      practiceSessions,
      libraryPlays,
      gamePlans,
      {
        id: play.id,
        title: play.title,
        tags: play.tags,
        series: play.series,
      },
    );
  }, [
    gamePlans,
    libraryPlays,
    organizerHydrated,
    play.id,
    play.series,
    play.tags,
    play.title,
    practiceSessions,
    selectedGamePlan,
  ]);

  const analyzeCoachOptions = useMemo(
    () => ({
      playbooks,
      allGamePlans: gamePlans,
      practiceSessions,
    }),
    [gamePlans, playbooks, practiceSessions],
  );

  const handleGamePlanChange = useCallback((planId: string) => {
    const next = planId || null;
    setSelectedGamePlanId(next);
    try {
      if (next) {
        localStorage.setItem(DESIGNER_COACH_GAME_PLAN_STORAGE_KEY, next);
      } else {
        localStorage.removeItem(DESIGNER_COACH_GAME_PLAN_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [coaching, setCoaching] = useState<FilmClipCoachingRecommendations | null>(
    null,
  );
  const [bundles, setBundles] = useState<DesignerCoachApplyBundle[]>([]);
  const [alternatives, setAlternatives] = useState<DesignerCoachAlternative[]>([]);
  const [linkedPlays, setLinkedPlays] = useState<DesignerCoachLinkedPlay[]>([]);
  const [inferredPatterns, setInferredPatterns] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [usedAi, setUsedAi] = useState(false);
  const [previewBundleKey, setPreviewBundleKey] = useState<string | null>(null);
  const [practiceBusyId, setPracticeBusyId] = useState<string | null>(null);
  const [importFrameOpen, setImportFrameOpen] = useState(false);
  const [importFramePlayId, setImportFramePlayId] = useState<string | null>(null);
  const [importFrameTitle, setImportFrameTitle] = useState("");
  const [importIntent, setImportIntent] = useState<
    | { kind: "alternative"; playTitle: string }
    | {
        kind: "counter";
        counter: FilmClipCounterSuggestion;
        mode: CounterLoadMode;
        playTitle: string;
      }
    | null
  >(null);
  const [counterLoadOpen, setCounterLoadOpen] = useState(false);
  const [counterLoadPending, setCounterLoadPending] = useState<{
    counter: FilmClipCounterSuggestion;
    playId: string;
    playTitle: string;
  } | null>(null);
  const analysisModeRef = useRef<"none" | "local" | "ai">("none");
  const autoAnalyzeKeyRef = useRef<string | null>(null);
  const isDrill = isDrillCoachContext(play.type);

  const filmSessionTitles = useMemo(
    () => new Map(filmSessions.map((session) => [session.id, session.title])),
    [filmSessions],
  );

  const filmEvidence = useMemo(() => {
    if (!selectedGamePlan) return [];
    return filterCoachFilmEvidence(
      selectedGamePlan,
      {
        id: play.id,
        title: play.title,
        tags: play.tags,
      },
      currentFrameIndex,
      inferredPatterns,
    );
  }, [
    currentFrameIndex,
    inferredPatterns,
    play.id,
    play.tags,
    play.title,
    selectedGamePlan,
  ]);

  useEffect(() => {
    if (!filmEvidence.length || filmHydrated) return;
    void loadFilmSessions();
  }, [filmEvidence.length, filmHydrated, loadFilmSessions]);

  const alternativesEmptyMessage = useMemo(
    () =>
      buildCoachAlternativesEmptyMessage({
        play,
        libraryCount: libraryPlays.length,
        hasGamePlan: Boolean(selectedGamePlan),
      }),
    [libraryPlays.length, play, selectedGamePlan],
  );

  const applyLocalCoachResult = useCallback(
    (result: ReturnType<typeof analyzePlayLocally>) => {
      setCoaching(result.coaching);
      setBundles(result.bundles);
      setAlternatives(result.alternatives);
      setLinkedPlays(result.linkedPlays);
      setInferredPatterns(result.inferredPatterns);
    },
    [],
  );

  useEffect(() => {
    setPreviewBundleKey(null);
    clearCoachPreviewFixes();
  }, [clearCoachPreviewFixes, currentFrameIndex]);

  const clearPreview = useCallback(() => {
    setPreviewBundleKey(null);
    clearCoachPreviewFixes();
  }, [clearCoachPreviewFixes]);

  const toggleBundlePreview = useCallback(
    (bundle: DesignerCoachApplyBundle) => {
      if (previewBundleKey === bundle.key && coachPreviewFixes) {
        clearPreview();
        return;
      }
      setPreviewBundleKey(bundle.key);
      setCoachPreviewFixes(bundle.fixes);
      const target = previewSelectionForFixes(bundle.fixes, frame);
      if (target.objectId) {
        selectObject(target.objectId);
        return;
      }
      if (target.actionId) {
        selectAction(target.actionId);
      }
    },
    [
      clearPreview,
      coachPreviewFixes,
      frame,
      previewBundleKey,
      selectAction,
      selectObject,
      setCoachPreviewFixes,
    ],
  );

  const frameLabel = frame
    ? primaryFrameLabel(frame, currentFrameIndex)
    : `Frame ${currentFrameIndex + 1}`;

  const counterMatches = useMemo(() => {
    if (!coaching) return [];
    const gamePlanLinks = linkedPlays.filter((row) =>
      row.reason.toLowerCase().includes("game plan"),
    );
    return coaching.counters.map((counter) => {
      const fromLocal = linkedPlays.filter((row) =>
        row.reason.toLowerCase().includes(counter.targetsPattern?.toLowerCase() ?? ""),
      );
      if (fromLocal.length) return fromLocal;
      if (
        gamePlanLinks.length &&
        (counter.detail.toLowerCase().includes("scout") ||
          counter.title.toLowerCase().includes("scout"))
      ) {
        return gamePlanLinks;
      }
      return suggestDefensePlaysForCounter(
        libraryPlays,
        counter,
        new Set([play.id]),
        2,
      ).map((row) => ({
        playId: row.play.id,
        title: row.play.title,
        reason: row.reasons[0] ?? "",
      }));
    });
  }, [coaching, linkedPlays, libraryPlays, play.id]);

  const appendNotes = useCallback(
    (block: string) => {
      if (!frame) return;
      const next = appendDesignerCoachingToNotes(frame.notes, block);
      setFrameNotes(next);
    },
    [frame, setFrameNotes],
  );

  const appendCategory = useCallback(
    (categoryId: FilmClipCoachingCategoryId) => {
      if (!coaching) return;
      const slice: FilmClipCoachingRecommendations = {
        alternativeOptions: [],
        counters: [],
        defensiveAdjustments: [],
        spacingFixes: [],
        timingCorrections: [],
      };
      switch (categoryId) {
        case "alternativeOptions":
          slice.alternativeOptions = coaching.alternativeOptions;
          break;
        case "counters":
          slice.counters = coaching.counters;
          break;
        case "defensiveAdjustments":
          slice.defensiveAdjustments = coaching.defensiveAdjustments;
          break;
        case "spacingFixes":
          slice.spacingFixes = coaching.spacingFixes;
          break;
        case "timingCorrections":
          slice.timingCorrections = coaching.timingCorrections;
          break;
      }
      appendNotes(
        formatDesignerCoachingForNotes(slice, play.title, frameLabel),
      );
    },
    [appendNotes, coaching, frameLabel, play.title],
  );

  const courtFixes = useMemo(
    () => bundles.flatMap((bundle) => bundle.fixes),
    [bundles],
  );

  const applyBundleFixes = useCallback(
    (fixes: DesignerCoachFix[]) => {
      clearPreview();
      applyCoachFixes(fixes);
      const added = fixes.find((fix) => fix.type === "addDefense");
      if (added) {
        selectObject(added.objectId);
        return;
      }
      const styled = fixes.find((fix) => fix.type === "setDefenseStyle");
      if (styled) {
        selectObject(styled.objectId);
      }
    },
    [applyCoachFixes, clearPreview, selectObject],
  );

  const runLocalAnalyze = useCallback(() => {
    analysisModeRef.current = "local";
    autoAnalyzeKeyRef.current = `local:${currentFrameIndex}:${selectedGamePlanId ?? "none"}`;
    clearPreview();
    setAiError("");
    const result = analyzePlayLocally(
      play,
      currentFrameIndex,
      libraryPlays,
      selectedGamePlan,
      analyzeCoachOptions,
    );
    applyLocalCoachResult(result);
    setUsedAi(false);
  }, [
    analyzeCoachOptions,
    applyLocalCoachResult,
    clearPreview,
    currentFrameIndex,
    libraryPlays,
    play,
    selectedGamePlan,
    selectedGamePlanId,
  ]);

  const runAiAnalyze = useCallback(async () => {
    if (!frame) return;
    analysisModeRef.current = "ai";
    autoAnalyzeKeyRef.current = `ai:${currentFrameIndex}:${selectedGamePlanId ?? "none"}`;
    clearPreview();
    setAiLoading(true);
    setAiError("");
    try {
      const libraryContext = buildDesignerCoachLibraryContext(play, libraryPlays);
      const snapshot = buildDesignerCoachSnapshot(
        play,
        currentFrameIndex,
        gamePlanSnapshot,
        libraryContext,
      );
      const res = await fetch("/api/designer/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        coaching?: FilmClipCoachingRecommendations;
        applyBundles?: DesignerCoachApplyBundle[];
        aiLibraryAlternatives?: Array<{
          playId: string;
          title: string;
          detail: string;
          priority?: "high" | "medium" | "low";
        }>;
      };
      if (!res.ok || !data.ok || !data.coaching) {
        setAiError(data.error ?? "AI coaching failed.");
        return;
      }
      const local = analyzePlayLocally(
        play,
        currentFrameIndex,
        libraryPlays,
        selectedGamePlan,
        analyzeCoachOptions,
      );
      setCoaching(mergeCoaching(local.coaching, data.coaching));
      setBundles(
        mergeCoachBundles(local.bundles, data.applyBundles ?? []),
      );
      setAlternatives(
        mergeAiGroundedAlternatives(
          local.alternatives,
          data.aiLibraryAlternatives ?? [],
          libraryPlays,
        ),
      );
      setLinkedPlays(local.linkedPlays);
      setInferredPatterns(local.inferredPatterns);
      setUsedAi(true);
    } catch {
      setAiError("Could not reach AI service.");
    } finally {
      setAiLoading(false);
    }
  }, [
    analyzeCoachOptions,
    clearPreview,
    currentFrameIndex,
    frame,
    gamePlanSnapshot,
    libraryPlays,
    play,
    selectedGamePlan,
    selectedGamePlanId,
  ]);

  useEffect(() => {
    const mode = analysisModeRef.current;
    if (mode === "none") return;
    const key = `${mode}:${currentFrameIndex}:${selectedGamePlanId ?? "none"}`;
    if (autoAnalyzeKeyRef.current === key) return;
    autoAnalyzeKeyRef.current = key;
    if (mode === "local") {
      clearPreview();
      const result = analyzePlayLocally(
        play,
        currentFrameIndex,
        libraryPlays,
        selectedGamePlan,
        analyzeCoachOptions,
      );
      applyLocalCoachResult(result);
      setUsedAi(false);
      return;
    }
    void runAiAnalyze();
  }, [
    analyzeCoachOptions,
    applyLocalCoachResult,
    clearPreview,
    currentFrameIndex,
    libraryPlays,
    play,
    runAiAnalyze,
    selectedGamePlan,
    selectedGamePlanId,
  ]);

  const addAllToNotes = useCallback(() => {
    if (!coaching) return;
    appendNotes(formatDesignerCoachingForNotes(coaching, play.title, frameLabel));
  }, [appendNotes, coaching, frameLabel, play.title]);

  const applySamePlayFrame = useCallback(
    async (alternative: Extract<DesignerCoachAlternative, { kind: "same-play" }>) => {
      if (!frame) return;
      const sourceFrame = play.frames[alternative.frameIndex];
      if (!sourceFrame) return;
      const ok = await appConfirm({
        title: "Use frame from this play",
        message: `Replace ${frameLabel} with "${alternative.title}"? You can undo after.`,
        confirmLabel: "Use frame",
      });
      if (!ok) return;
      clearPreview();
      const imported = cloneFrameForImport(sourceFrame, { frameName: frame.name });
      replaceCurrentFrame(imported);
      appNotice("Coach", `Applied "${alternative.title}" to ${frameLabel}.`);
    },
    [clearPreview, frame, frameLabel, play.frames, replaceCurrentFrame],
  );

  const openAlternativeImport = useCallback(
    (alternative: DesignerCoachAlternative) => {
      if (alternative.kind === "same-play") {
        void applySamePlayFrame(alternative);
        return;
      }
      setImportIntent({ kind: "alternative", playTitle: alternative.playTitle });
      setImportFramePlayId(alternative.playId);
      setImportFrameTitle(alternative.playTitle);
      setImportFrameOpen(true);
    },
    [applySamePlayFrame],
  );

  const openCounterLoad = useCallback(
    (counter: FilmClipCounterSuggestion, matchedPlays: DesignerCoachLinkedPlay[]) => {
      const resolved = resolveCounterDefensePlay(
        counter,
        libraryPlays,
        matchedPlays,
        play.id,
      );
      if (!resolved) {
        appNotice(
          "Coach",
          "No matching defense play in your library for this counter.",
        );
        return;
      }
      setCounterLoadPending({
        counter,
        playId: resolved.playId,
        playTitle: resolved.title,
      });
      setCounterLoadOpen(true);
    },
    [libraryPlays, play.id],
  );

  const handleCounterLoadMode = useCallback(
    (mode: CounterLoadMode) => {
      if (!counterLoadPending) return;
      setImportIntent({
        kind: "counter",
        counter: counterLoadPending.counter,
        mode,
        playTitle: counterLoadPending.playTitle,
      });
      setImportFramePlayId(counterLoadPending.playId);
      setImportFrameTitle(counterLoadPending.playTitle);
      setCounterLoadOpen(false);
      setCounterLoadPending(null);
      setImportFrameOpen(true);
    },
    [counterLoadPending],
  );

  const handleImportFrame = useCallback(
    async (sourceFrame: DesignerFrame) => {
      if (!frame || !importIntent) return;

      if (importIntent.kind === "alternative") {
        const ok = await appConfirm({
          title: "Import alternative frame",
          message: `Replace ${frameLabel} with a frame from "${importIntent.playTitle}"? You can undo after.`,
          confirmLabel: "Import frame",
        });
        if (!ok) return;
        clearPreview();
        const imported = cloneFrameForImport(sourceFrame, { frameName: frame.name });
        replaceCurrentFrame(imported);
        appNotice("Coach", `Imported frame from ${importIntent.playTitle}.`);
      } else if (importIntent.mode === "replace") {
        const ok = await appConfirm({
          title: "Load counter on court",
          message: `Replace ${frameLabel} with "${importIntent.counter.title}" from ${importIntent.playTitle}? You can undo after.`,
          confirmLabel: "Replace frame",
        });
        if (!ok) return;
        clearPreview();
        const imported = cloneFrameForImport(sourceFrame, { frameName: frame.name });
        replaceCurrentFrame(imported);
        appNotice(
          "Coach",
          `Loaded ${importIntent.counter.title} on ${frameLabel}.`,
        );
      } else {
        const ok = await appConfirm({
          title: "Add counter read frame",
          message: `Add a read frame from "${importIntent.playTitle}" for ${importIntent.counter.title}? You can undo after.`,
          confirmLabel: "Add read frame",
        });
        if (!ok) return;
        clearPreview();
        const imported = cloneFrameForImport(sourceFrame, {
          frameName: counterReadFrameLabel(importIntent.counter),
        });
        appendImportedReadFrame(
          imported,
          importIntent.counter.coverage,
          counterReadFrameLabel(importIntent.counter),
        );
        appNotice(
          "Coach",
          `Added read frame for ${importIntent.counter.title}.`,
        );
      }

      setImportFrameOpen(false);
      setImportFramePlayId(null);
      setImportIntent(null);
    },
    [
      appendImportedReadFrame,
      clearPreview,
      frame,
      frameLabel,
      importIntent,
      replaceCurrentFrame,
    ],
  );

  const addPrepReadToPractice = useCallback(
    async (recommendation: PrepReadRecommendation) => {
      if (!selectedGamePlan) return;
      setPracticeBusyId(recommendation.id);
      try {
        const items = createPrepReadPracticeItems(recommendation);
        let session = findPrepReadPracticeSession(
          selectedGamePlan,
          practiceSessions,
        );
        if (!session) {
          const created = await createPracticeSession();
          if (!created) {
            appNotice("Practice", "Could not create a practice session.");
            return;
          }
          await updatePracticeSession(created.id, {
            title: prepReadPracticeSessionTitle(selectedGamePlan),
            team: selectedGamePlan.team,
            notes: `Prep read drills vs ${selectedGamePlan.opponent}.`,
          });
          session =
            useOrganizerStore
              .getState()
              .practiceSessions.find((row) => row.id === created.id) ?? created;
        }
        const added = await appendPracticeItems(session.id, items);
        if (!added) {
          appNotice("Practice", "Could not add drill blocks.");
          return;
        }
        appNotice(
          "Practice",
          `Added ${recommendation.suggestedBlocks}× ${recommendation.call} to "${session.title}".`,
        );
      } finally {
        setPracticeBusyId(null);
      }
    },
    [
      appendPracticeItems,
      createPracticeSession,
      practiceSessions,
      selectedGamePlan,
      updatePracticeSession,
    ],
  );

  return (
    <div className="ds-coach-panel" id="designer-coach-panel">
      <p className="ds-coach-intro">
        {isDrill ? (
          <>
            Drill coaching for <strong>{frameLabel}</strong> — station spacing and
            timing cues (defensive counters are hidden for drills).
          </>
        ) : (
          <>
            Spacing, timing, counters, and alternatives for{" "}
            <strong>{frameLabel}</strong>.
          </>
        )}
      </p>

      {organizerHydrated ? (
        <div className="ds-coach-game-plan">
          <label className="ds-coach-game-plan-label" htmlFor="designer-coach-game-plan">
            Game plan
          </label>
          <select
            id="designer-coach-game-plan"
            className="ds-coach-game-plan-select"
            value={selectedGamePlanId ?? ""}
            onChange={(event) => handleGamePlanChange(event.target.value)}
          >
            <option value="">No game plan context</option>
            {eligibleGamePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title} · {formatGamePlanDate(plan.gameDate)}
              </option>
            ))}
          </select>
          {gamePlanSnapshot ? (
            <p className="ds-coach-game-plan-chip">
              Scout: {formatDesignerCoachGamePlanChip(gamePlanSnapshot)}
            </p>
          ) : eligibleGamePlans.length === 0 ? (
            <p className="ds-coach-game-plan-hint">
              Create a game plan in Library to bias counters vs an opponent.
            </p>
          ) : null}
        </div>
      ) : null}

      {selectedGamePlan && organizerHydrated ? (
        <section className="ds-coach-section ds-coach-prep-reads-section">
          <div className="ds-coach-section-head">
            <h3>Weak reads vs {selectedGamePlan.opponent}</h3>
          </div>
          {prepReads.length ? (
            <div className="ds-coach-cards">
              {prepReads.map((recommendation) => (
                <PrepReadCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  opponent={selectedGamePlan.opponent}
                  matchesCurrentPlay={prepReadMatchesCurrentPlay(recommendation, {
                    id: play.id,
                    title: play.title,
                    tags: play.tags,
                    series: play.series,
                  })}
                  practiceBusy={practiceBusyId === recommendation.id}
                  onAddNotes={() =>
                    appendNotes(
                      formatPrepReadCoachNotes(
                        recommendation,
                        selectedGamePlan.opponent,
                        frameLabel,
                      ),
                    )
                  }
                  onAddToPractice={() =>
                    void addPrepReadToPractice(recommendation)
                  }
                />
              ))}
            </div>
          ) : (
            <p className="ds-coach-empty">
              No weak read history vs {selectedGamePlan.opponent} yet — mark reads
              in Practice Live to surface prep drills here.
            </p>
          )}
        </section>
      ) : null}

      {selectedGamePlan && organizerHydrated && filmEvidence.length ? (
        <section className="ds-coach-section ds-coach-film-evidence-section">
          <div className="ds-coach-section-head">
            <h3>Film evidence</h3>
          </div>
          <div className="ds-coach-cards">
            {filmEvidence.map((item) => (
              <FilmEvidenceCard
                key={item.id}
                item={item}
                sessionTitle={filmSessionTitles.get(item.sessionId)}
                opponent={selectedGamePlan.opponent}
                onAddNotes={() =>
                  appendNotes(
                    formatCoachFilmEvidenceNotes(item, selectedGamePlan.opponent),
                  )
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {coachPreviewFixes?.length ? (
        <p className="ds-coach-preview-banner">
          Ghost preview on court — dashed markers show positions after Apply.{" "}
          <button type="button" className="ds-coach-preview-clear" onClick={clearPreview}>
            Clear
          </button>
        </p>
      ) : null}

      <div className="ds-coach-toolbar">
        <button
          type="button"
          className="ds-coach-btn is-primary"
          onClick={runLocalAnalyze}
        >
          Analyze frame
        </button>
        <button
          type="button"
          className="ds-coach-btn"
          disabled={aiLoading}
          onClick={() => void runAiAnalyze()}
        >
          {aiLoading ? "AI…" : "Ask AI"}
        </button>
      </div>

      {inferredPatterns.length ? (
        <p className="ds-coach-patterns">
          Detected: {inferredPatterns.join(", ")}
          {selectedGamePlan ? ` · vs ${selectedGamePlan.opponent}` : ""}
          {usedAi ? " · AI enhanced" : ""}
        </p>
      ) : null}

      {aiError ? (
        <p className="ds-coach-error" role="alert">
          {aiError}
        </p>
      ) : null}

      {!coaching ? (
        <p className="ds-coach-empty">
          Run <strong>Analyze frame</strong> for instant suggestions, or{" "}
          <strong>Ask AI</strong> for deeper tactical reads (requires OpenAI key).
        </p>
      ) : !coachingHasSuggestions(coaching) ? (
        <p className="ds-coach-empty">
          No issues flagged on this frame — spacing and timing look solid.
        </p>
      ) : (
        <>
          <div className="ds-coach-bulk-actions">
            {courtFixes.length ? (
              <button
                type="button"
                className="ds-coach-btn is-primary"
                onClick={() => applyBundleFixes(courtFixes)}
              >
                Apply all court fixes
              </button>
            ) : null}
            <button type="button" className="ds-coach-btn" onClick={addAllToNotes}>
              Add all to notes
            </button>
          </div>

          {COACHING_CATEGORY_ORDER.map((categoryId) => {
            const items = coaching[categoryId];
            const categoryBundles = bundles.filter(
              (bundle) => bundle.category === categoryId,
            );
            if (
              !items.length &&
              !categoryBundles.length &&
              !(categoryId === "alternativeOptions" && alternatives.length)
            ) {
              return null;
            }
            return (
              <section key={categoryId} className="ds-coach-section">
                <div className="ds-coach-section-head">
                  <h3>{COACHING_CATEGORY_LABELS[categoryId]}</h3>
                  <button
                    type="button"
                    className="ds-coach-section-add"
                    onClick={() => appendCategory(categoryId)}
                  >
                    Add section
                  </button>
                </div>
                <div className="ds-coach-cards">
                  {categoryId === "counters"
                    ? coaching.counters.map((counter, index) => (
                        <CounterCard
                          key={`${counter.title}-${index}`}
                          counter={counter}
                          matchedPlays={counterMatches[index] ?? []}
                          canLoadOnCourt
                          onLoadOnCourt={() =>
                            openCounterLoad(
                              counter,
                              counterMatches[index] ?? [],
                            )
                          }
                          onAddNotes={() =>
                            appendNotes(
                              formatDesignerCoachingForNotes(
                                {
                                  ...coaching,
                                  alternativeOptions: [],
                                  defensiveAdjustments: [],
                                  spacingFixes: [],
                                  timingCorrections: [],
                                  counters: [counter],
                                },
                                play.title,
                                frameLabel,
                              ),
                            )
                          }
                        />
                      ))
                      : categoryId === "alternativeOptions"
                        ? alternatives.map((alternative) => (
                            <AlternativeOptionCard
                              key={
                                alternative.kind === "same-play"
                                  ? `same-${alternative.frameIndex}`
                                  : alternative.playId
                              }
                              alternative={alternative}
                              onImportFrame={() => openAlternativeImport(alternative)}
                              onAddNotes={() =>
                                appendNotes(`• ${alternative.title} — ${alternative.detail}`)
                              }
                            />
                          ))
                      : categoryId === "spacingFixes" ||
                        categoryId === "timingCorrections" ||
                        categoryId === "defensiveAdjustments"
                      ? categoryBundles.map((bundle) => (
                          <ApplyableBundleCard
                            key={bundle.key}
                            bundle={bundle}
                            previewFrame={frame}
                            previewActive={previewBundleKey === bundle.key}
                            onApply={() => applyBundleFixes(bundle.fixes)}
                            onPreview={() => toggleBundlePreview(bundle)}
                            onAddNotes={() =>
                              appendNotes(`• ${bundle.title} — ${bundle.detail}`)
                            }
                          />
                        ))
                      : items.map((item, index) => (
                          <SuggestionCard
                            key={`${item.title}-${index}`}
                            title={item.title}
                            detail={item.detail}
                            priority={item.priority}
                            onAddNotes={() =>
                              appendNotes(`• ${item.title} — ${item.detail}`)
                            }
                          />
                        ))}
                  {categoryId === "alternativeOptions" && !alternatives.length ? (
                    <p className="ds-coach-empty ds-coach-alt-empty">
                      {alternativesEmptyMessage}
                    </p>
                  ) : null}
                  {categoryId === "alternativeOptions" &&
                  !alternatives.length &&
                  linkedPlays.length
                    ? linkedPlays
                        .filter((row) =>
                          coaching.alternativeOptions.some((alt) =>
                            alt.title.includes(row.title),
                          ),
                        )
                        .map((row) => (
                          <div key={row.playId} className="ds-coach-alt-link">
                            <Link
                              href={`/designer?item=${encodeURIComponent(row.playId)}`}
                              className="ds-coach-link-play"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Open {row.title}
                            </Link>
                          </div>
                        ))
                    : null}
                </div>
              </section>
            );
          })}
        </>
      )}

      <CounterLoadModeModal
        open={counterLoadOpen}
        counterTitle={counterLoadPending?.counter.title ?? "Counter"}
        playTitle={counterLoadPending?.playTitle ?? "Defense play"}
        onClose={() => {
          setCounterLoadOpen(false);
          setCounterLoadPending(null);
        }}
        onSelect={handleCounterLoadMode}
      />

      <ImportFrameModal
        open={importFrameOpen}
        items={libraryItems}
        getPlayDocument={getPlayDocument}
        initialPlayId={importFramePlayId}
        title={
          importIntent?.kind === "counter"
            ? `Load ${importIntent.counter.title} from ${importFrameTitle}`
            : importFrameTitle
              ? `Import frame from ${importFrameTitle}`
              : "Import frame from library"
        }
        onClose={() => {
          setImportFrameOpen(false);
          setImportFramePlayId(null);
          setImportIntent(null);
        }}
        onImport={(sourceFrame) => void handleImportFrame(sourceFrame)}
      />
    </div>
  );
}
