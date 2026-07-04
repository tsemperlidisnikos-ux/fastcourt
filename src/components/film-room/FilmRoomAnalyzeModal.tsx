"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useDraggablePanel } from "@/hooks/useDraggablePanel";
import { gamePlanCategoryLabel } from "@/lib/game-plan/constants";
import { FilmRoomCoachingSections } from "@/components/film-room/FilmRoomCoachingSections";
import { FilmRoomDisruptionPanel } from "@/components/film-room/FilmRoomDisruptionPanel";
import { FilmScoutPrintOverlay } from "@/components/film-room/FilmScoutPrintOverlay";
import {
  buildAiScoutGamePlanPatch,
  previewAiScoutDefensePlays,
  previewAiScoutOffensePlays,
} from "@/lib/film-room/apply-ai-scout-to-game-plan";
import {
  allCoachingCueKeys,
  coachingCueKey,
  coachingHasSuggestions,
} from "@/lib/film-room/film-coaching-format";
import type { FilmClipCoachingCategoryId } from "@/lib/film-room/film-clip-analyze-types";
import { sortGamePlans } from "@/lib/game-plan/game-plan-items";
import {
  buildGamePlanDeepLink,
  formatFilmTimestamp,
} from "@/lib/film-room/film-game-plan-link";
import {
  formatFilmAnalyzeSourceLine,
  formatFilmAnalyzeTagsSummary,
  type FilmAnalyzeContext,
} from "@/lib/film-room/film-analyze-context";
import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import { buildFilmScoutPrintModel } from "@/lib/film-room/film-scout-print-model";
import {
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { appNotice } from "@/stores/dialog-store";
import type { FilmRoomVideoSource } from "@/types/film-room";

interface Props {
  open: boolean;
  sessionId: string;
  sessionTitle: string;
  sessionSource: FilmRoomVideoSource;
  currentTime: number;
  analysis: FilmClipAnalysisResult;
  analyzeContext?: FilmAnalyzeContext | null;
  filmPreviewUrl?: string;
  onClose: () => void;
}

export function FilmRoomAnalyzeModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <FilmRoomAnalyzeModalBody {...props} />;
}

function FilmRoomAnalyzeModalBody({
  sessionId,
  sessionTitle,
  sessionSource,
  currentTime,
  analysis,
  analyzeContext,
  filmPreviewUrl,
  onClose,
}: Omit<Props, "open">) {
  const router = useRouter();
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const plays = useOrganizerStore((s) => s.plays);
  const metaHydrated = useOrganizerStore((s) => s.hydrated);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);
  const updateGamePlan = useOrganizerStore((s) => s.updateGamePlan);
  const addPlaysToGamePlanCategory = useOrganizerStore(
    (s) => s.addPlaysToGamePlanCategory,
  );

  useEffect(() => {
    if (!metaHydrated) void loadMeta();
  }, [metaHydrated, loadMeta]);

  const plans = useMemo(
    () =>
      sortGamePlans(gamePlans).filter((plan) => plan.status !== "archived"),
    [gamePlans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedKinds, setSelectedKinds] = useState<Set<number>>(
    () => new Set(analysis.tendencies.map((_, index) => index)),
  );
  const [selectedPatterns, setSelectedPatterns] = useState<Set<number>>(
    () => new Set(analysis.playPatterns.map((_, index) => index)),
  );
  const [includeDefensePlays, setIncludeDefensePlays] = useState(true);
  const [includeOffensePlays, setIncludeOffensePlays] = useState(true);
  const [includeCoachingNotes, setIncludeCoachingNotes] = useState(true);
  const [selectedCoachingKeys, setSelectedCoachingKeys] = useState<
    Set<string>
  >(() => new Set(allCoachingCueKeys(analysis.coaching)));
  const [busy, setBusy] = useState(false);
  const [scoutPrintModel, setScoutPrintModel] = useState<
    ReturnType<typeof buildFilmScoutPrintModel> | null
  >(null);

  useEffect(() => {
    if (!plans.length) {
      setSelectedPlanId(null);
      return;
    }
    setSelectedPlanId((current) =>
      current && plans.some((plan) => plan.id === current)
        ? current
        : plans[0]!.id,
    );
  }, [plans]);

  const timeLabel = formatFilmTimestamp(currentTime);
  const analyzeSourceLine = analyzeContext
    ? formatFilmAnalyzeSourceLine(analyzeContext)
    : null;
  const analyzeTagsLine = analyzeContext
    ? formatFilmAnalyzeTagsSummary(analyzeContext.coachTags)
    : "";
  const selectedPlan = plans.find((row) => row.id === selectedPlanId) ?? null;
  const selectedIndices = useMemo(
    () => [...selectedKinds].sort((a, b) => a - b),
    [selectedKinds],
  );
  const selectedPatternIndices = useMemo(
    () => [...selectedPatterns].sort((a, b) => a - b),
    [selectedPatterns],
  );

  const patchInput = useMemo(() => {
    if (!selectedPlan) return null;
    return {
      plan: selectedPlan,
      plays,
      analysis,
      sessionId,
      sessionTitle,
      timestamp: currentTime,
      selectedTendencyIndices: selectedIndices,
      selectedPatternIndices,
      selectedCoachingKeys,
      coachTags: analyzeContext?.coachTags ?? [],
      disruptionTags: analyzeContext?.disruptionTags ?? [],
    };
  }, [
    analysis,
    analyzeContext?.coachTags,
    analyzeContext?.disruptionTags,
    currentTime,
    plays,
    selectedCoachingKeys,
    selectedIndices,
    selectedPatternIndices,
    selectedPlan,
    sessionId,
    sessionTitle,
  ]);

  const defensePreview = useMemo(() => {
    if (!patchInput || !includeDefensePlays) return [];
    return previewAiScoutDefensePlays(patchInput);
  }, [includeDefensePlays, patchInput]);

  const offensePreview = useMemo(() => {
    if (!patchInput || !includeOffensePlays) return [];
    return previewAiScoutOffensePlays(patchInput);
  }, [includeOffensePlays, patchInput]);

  const applyMeta = useMemo(() => {
    const parts: string[] = [];
    if (selectedKinds.size) {
      parts.push(`${selectedKinds.size} tag${selectedKinds.size === 1 ? "" : "s"}`);
    }
    if (includeDefensePlays && defensePreview.length) {
      parts.push(`${defensePreview.length} defense`);
    }
    if (includeOffensePlays && offensePreview.length) {
      parts.push(`${offensePreview.length} offense`);
    }
    if (
      includeCoachingNotes &&
      selectedCoachingKeys.size &&
      coachingHasSuggestions(analysis.coaching)
    ) {
      parts.push(
        `${selectedCoachingKeys.size} coaching cue${selectedCoachingKeys.size === 1 ? "" : "s"}`,
      );
    }
    if (analyzeContext?.coachTags.length) {
      parts.push(
        `${analyzeContext.coachTags.length} coach tag${analyzeContext.coachTags.length === 1 ? "" : "s"}`,
      );
    }
    return parts.join(" · ") || "Scout tags only";
  }, [
    analysis.coaching,
    analyzeContext?.coachTags.length,
    defensePreview.length,
    includeCoachingNotes,
    includeDefensePlays,
    includeOffensePlays,
    offensePreview.length,
    selectedCoachingKeys.size,
    selectedKinds.size,
  ]);

  function toggleIndex(index: number) {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function togglePattern(index: number) {
    setSelectedPatterns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleCoachingCue(
    categoryId: FilmClipCoachingCategoryId,
    index: number,
  ) {
    const key = coachingCueKey(categoryId, index);
    setSelectedCoachingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleApplyFullScout() {
    if (!selectedPlanId || busy || !selectedKinds.size || !patchInput) return;
    const plan = plans.find((row) => row.id === selectedPlanId);
    if (!plan) return;

    setBusy(true);
    try {
      const patch = buildAiScoutGamePlanPatch({
        ...patchInput,
        includeDefensePlays,
        includeOffensePlays,
        includeCoachingNotes,
        selectedCoachingKeys,
      });

      await updateGamePlan(plan.id, {
        opponentBoard: patch.opponentBoard,
        ...(patch.scoutingNotes ? { scoutingNotes: patch.scoutingNotes } : {}),
        ...(patch.timeoutCues ? { timeoutCues: patch.timeoutCues } : {}),
        ...(patch.filmRefs ? { filmRefs: patch.filmRefs } : {}),
      });

      if (patch.defensePlayIds.length) {
        await addPlaysToGamePlanCategory(
          plan.id,
          "defense",
          patch.defensePlayIds,
        );
      }

      const offenseByCategory = new Map<string, string[]>();
      for (const entry of patch.offenseEntries) {
        const list = offenseByCategory.get(entry.categoryId) ?? [];
        list.push(entry.playId);
        offenseByCategory.set(entry.categoryId, list);
      }
      for (const [categoryId, playIds] of offenseByCategory) {
        await addPlaysToGamePlanCategory(
          plan.id,
          categoryId as Parameters<typeof addPlaysToGamePlanCategory>[1],
          playIds,
        );
      }

      const parts: string[] = [];
      if (patch.tendencyCount) {
        parts.push(
          `${patch.tendencyCount} scout tag${patch.tendencyCount === 1 ? "" : "s"}`,
        );
      }
      if (patch.defensePlayIds.length) {
        parts.push(
          `${patch.defensePlayIds.length} defensive play${patch.defensePlayIds.length === 1 ? "" : "s"}`,
        );
      }
      if (patch.offenseEntries.length) {
        parts.push(
          `${patch.offenseEntries.length} offense play${patch.offenseEntries.length === 1 ? "" : "s"}`,
        );
      }
      if (patch.coachingSuggestionCount) {
        parts.push(
          `${patch.coachingSuggestionCount} coaching cue${patch.coachingSuggestionCount === 1 ? "" : "s"}`,
        );
      }
      if (patch.timeoutCues?.length) {
        parts.push(
          `${patch.timeoutCues.length} timeout counter${patch.timeoutCues.length === 1 ? "" : "s"}`,
        );
      }

      appNotice(
        "Game plan",
        `Applied to ${plan.title}: ${parts.join(" + ")}.`,
      );
      onClose();
      router.push(buildGamePlanDeepLink(plan.id));
    } finally {
      setBusy(false);
    }
  }

  const canApply =
    metaHydrated && !!plans.length && !!selectedPlanId && selectedKinds.size > 0 && !busy;

  function openScoutPdf() {
    const coachTags =
      analyzeContext?.coachTags.map((tag) => ({
        kind: tag.kind,
        time: tag.time,
        note: tag.note,
      })) ?? [];
    const disruptionTags =
      analyzeContext?.disruptionTags.map((tag) => ({
        kind: tag.kind,
        time: tag.time,
        note: tag.note,
      })) ?? [];
    setScoutPrintModel(
      buildFilmScoutPrintModel({
        session: {
          id: sessionId,
          title: sessionTitle,
          source: sessionSource,
        },
        origin: window.location.origin,
        teamName: resolvePdfCoverTeam(pdfBrand),
        footerText: resolvePdfFooterText(pdfBrand),
        clips: [
          {
            playheadTime: currentTime,
            result: analysis,
            coachTags,
            disruptionTags,
          },
        ],
      }),
    );
  }

  const { panelRef, panelStyle, headerProps, dragging } = useDraggablePanel(
    `${sessionId}-${currentTime}`,
  );

  return createPortal(
    <div className="fc-film-game-plan-overlay" role="dialog" aria-modal="true">
      <div className="fc-film-game-plan-backdrop" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        className={`fc-film-game-plan-panel fc-film-analyze-panel fc-film-analyze-panel-draggable${dragging ? " is-dragging" : ""}`}
        style={panelStyle}
      >
        <header
          className="fc-film-game-plan-header fc-film-game-plan-header-draggable"
          {...headerProps}
        >
          <span className="fc-film-panel-drag-hint" aria-hidden title="Drag to move">
            ⋮⋮
          </span>
          <h2>AI Coaching Assistant</h2>
          <p>
            {sessionTitle}
            {timeLabel ? ` @ ${timeLabel}` : ""}
          </p>
          {analyzeSourceLine ? (
            <p className="fc-film-analyze-source-line">{analyzeSourceLine}</p>
          ) : null}
          {analyzeTagsLine ? (
            <p className="fc-film-analyze-tags-line">Coach tags: {analyzeTagsLine}</p>
          ) : null}
          <p className="fc-film-analyze-step-hint">
            Scout read + coaching cues below. Tap <strong>Apply full scout</strong> to
            push tags, plays, and notes to your game plan.
          </p>
        </header>

        <div className="fc-film-game-plan-body">
          <p className="fc-film-analyze-summary">{analysis.summary}</p>

          <FilmRoomDisruptionPanel
            analysis={analysis}
            disruptionTags={analyzeContext?.disruptionTags ?? []}
            plays={plays}
            sessionId={sessionId}
            sessionTitle={sessionTitle}
            timestamp={currentTime}
            filmPreviewUrl={filmPreviewUrl}
          />

          <h3 className="fc-film-game-plan-section-title">Coaching suggestions</h3>
          <p className="fc-film-analyze-coaching-hint">
            Check the cues you want in scouting notes.
          </p>
          <FilmRoomCoachingSections
            coaching={analysis.coaching}
            selectedKeys={selectedCoachingKeys}
            onToggle={toggleCoachingCue}
            plays={plays}
          />

          {!metaHydrated ? (
            <p className="fc-film-game-plan-empty">Loading game plans…</p>
          ) : !plans.length ? (
            <div className="fc-film-analyze-no-plans">
              <p className="fc-film-game-plan-empty">
                Create a game plan first, then come back here to apply the AI scout read.
              </p>
              <Link
                href="/library?tab=gameplan"
                className="fc-film-analyze-create-plan-link"
                onClick={onClose}
              >
                Open Game Plan →
              </Link>
            </div>
          ) : (
            <>
              <h3 className="fc-film-game-plan-section-title">Game plan</h3>
              <ul className="fc-film-game-plan-plan-list">
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  return (
                    <li key={plan.id}>
                      <button
                        type="button"
                        className={`fc-film-game-plan-plan-row${selected ? " selected" : ""}`}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        <span className="fc-film-game-plan-plan-title">{plan.title}</span>
                        <span className="fc-film-game-plan-plan-meta">
                          {plan.gameDate} · vs {plan.opponent}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <h3 className="fc-film-game-plan-section-title">Suggested tendencies</h3>
              <ul className="fc-film-analyze-tendency-list">
                {analysis.tendencies.map((row, index) => {
                  const checked = selectedKinds.has(index);
                  return (
                    <li key={`${row.kind}-${index}`}>
                      <label
                        className={`fc-film-analyze-tendency-row${checked ? " selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleIndex(index)}
                        />
                        <span className="fc-film-analyze-tendency-main">
                          <span className="fc-film-analyze-tendency-label">
                            {row.label}
                            <span className="fc-film-analyze-confidence">
                              {Math.round(row.confidence * 100)}%
                            </span>
                          </span>
                          {row.notes ? (
                            <span className="fc-film-analyze-tendency-note">{row.notes}</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {analysis.playPatterns.length ? (
                <>
                  <h3 className="fc-film-game-plan-section-title">Play patterns</h3>
                  <ul className="fc-film-analyze-pattern-list">
                    {analysis.playPatterns.map((row, index) => {
                      const checked = selectedPatterns.has(index);
                      return (
                        <li key={`${row.tag}-${index}`}>
                          <label
                            className={`fc-film-analyze-pattern-row${checked ? " selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePattern(index)}
                            />
                            <span className="fc-film-analyze-pattern-tag">{row.tag}</span>
                            <span className="fc-film-analyze-confidence">
                              {Math.round(row.confidence * 100)}%
                            </span>
                            {row.notes ? (
                              <span className="fc-film-analyze-tendency-note">{row.notes}</span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}

              <div className="fc-film-analyze-include-row">
                <label className="fc-film-analyze-defense-toggle">
                  <input
                    type="checkbox"
                    checked={includeCoachingNotes}
                    onChange={(e) => setIncludeCoachingNotes(e.target.checked)}
                  />
                  <span>Add selected coaching notes to game plan</span>
                </label>
                <label className="fc-film-analyze-defense-toggle">
                  <input
                    type="checkbox"
                    checked={includeDefensePlays}
                    onChange={(e) => setIncludeDefensePlays(e.target.checked)}
                  />
                  <span>Add defensive plays from library</span>
                </label>
                <label className="fc-film-analyze-defense-toggle">
                  <input
                    type="checkbox"
                    checked={includeOffensePlays}
                    onChange={(e) => setIncludeOffensePlays(e.target.checked)}
                  />
                  <span>Add matching offense plays (Horns, PNR…)</span>
                </label>
              </div>

              {includeDefensePlays ? (
                <div className="fc-film-analyze-defense-preview">
                  <h3 className="fc-film-game-plan-section-title">Defensive plays</h3>
                  {!defensePreview.length ? (
                    <p className="fc-film-analyze-defense-empty">
                      No defense matches — tag plays with coverage (ICE, switch, blitz)
                      or tendency (zone, press).
                    </p>
                  ) : (
                    <ul className="fc-film-analyze-defense-list">
                      {defensePreview.map((play) => (
                        <li key={play.id} className="fc-film-analyze-defense-row">
                          {play.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {includeOffensePlays ? (
                <div className="fc-film-analyze-defense-preview">
                  <h3 className="fc-film-game-plan-section-title">Offense plays</h3>
                  {!offensePreview.length ? (
                    <p className="fc-film-analyze-defense-empty">
                      No offense matches — tag plays with pattern names (Horns, PNR, Flare…).
                    </p>
                  ) : (
                    <ul className="fc-film-analyze-defense-list">
                      {offensePreview.map(({ play, categoryId }) => (
                        <li key={play.id} className="fc-film-analyze-defense-row">
                          <span>{play.title}</span>
                          <span className="fc-film-analyze-offense-cat">
                            → {gamePlanCategoryLabel(categoryId)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        <footer className="fc-film-game-plan-footer fc-film-analyze-footer">
          <button type="button" className="fc-film-game-plan-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="fc-film-analyze-pdf-btn"
            onClick={openScoutPdf}
          >
            Scout PDF
          </button>
          <div className="fc-film-analyze-apply-wrap">
            <button
              type="button"
              className="fc-film-analyze-add-btn fc-film-analyze-apply-btn"
              disabled={!canApply}
              title={
                !plans.length
                  ? "Create a game plan under Library → Game Plan"
                  : undefined
              }
              onClick={() => void handleApplyFullScout()}
            >
              {busy ? "Applying…" : "Apply full scout"}
            </button>
            {metaHydrated && plans.length && selectedKinds.size ? (
              <span className="fc-film-analyze-apply-meta">{applyMeta}</span>
            ) : null}
          </div>
        </footer>
      </div>
      {scoutPrintModel ? (
        <FilmScoutPrintOverlay
          model={scoutPrintModel}
          onClose={() => setScoutPrintModel(null)}
        />
      ) : null}
    </div>,
    document.body,
  );
}
