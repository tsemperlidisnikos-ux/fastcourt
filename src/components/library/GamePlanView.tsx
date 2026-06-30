"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddPlayToPlaybookModal } from "@/components/library/AddPlayToPlaybookModal";
import { GamePlanHomeworkPanel } from "@/components/library/GamePlanHomeworkPanel";
import { GameDayOverlay } from "@/components/library/GameDayOverlay";
import { GamePlanBenchPrintOverlay } from "@/components/library/GamePlanBenchPrintOverlay";
import { GamePlanSuggestModal } from "@/components/library/GamePlanSuggestModal";
import { PrintPreviewIcon } from "@/components/library/PrintPreviewIcon";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { GAME_PLAN_CATEGORIES } from "@/lib/game-plan/constants";
import { computePrepPracticeDate } from "@/lib/game-plan/prep-practice";
import {
  formatGamePlanDate,
  formatGamePlanHomeAway,
  gamePlanEntryCount,
  gamePlanStatusLabel,
  groupGamePlanEntries,
  isGamePlanUpcoming,
  resolveGamePlanEntryLabel,
  sortGamePlans,
} from "@/lib/game-plan/game-plan-items";
import { findOpponentHistory } from "@/lib/game-plan/opponent-history";
import {
  homeworkForGamePlan,
} from "@/lib/game-plan/player-homework";
import {
  buildSmartGameDayUrl,
  buildSmartGamePlanUrl,
  copyShareResult,
  DEFAULT_SHARE_STAGE,
} from "@/lib/share/share-link";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  appConfirm,
  appNotice,
  appPrompt,
} from "@/stores/dialog-store";
import type { GamePlanCategoryId, GamePlanStatus } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

const CourtFrameThumbnail = dynamic(
  () =>
    import("@/components/designer/CourtFrameThumbnail").then(
      (mod) => mod.CourtFrameThumbnail,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fc-game-plan-preview-loading" aria-hidden>
        …
      </div>
    ),
  },
);

const PAGE_SIZE = 10;

function formatUpdated(iso: string) {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "recently";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GamePlanView() {
  const router = useRouter();
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const playerHomework = useOrganizerStore((s) => s.playerHomework);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const createGamePlan = useOrganizerStore((s) => s.createGamePlan);
  const updateGamePlan = useOrganizerStore((s) => s.updateGamePlan);
  const deleteGamePlan = useOrganizerStore((s) => s.deleteGamePlan);
  const duplicateGamePlanById = useOrganizerStore((s) => s.duplicateGamePlanById);
  const createRematchGamePlanById = useOrganizerStore(
    (s) => s.createRematchGamePlanById,
  );
  const setGamePlanStatus = useOrganizerStore((s) => s.setGamePlanStatus);
  const addPlaysToGamePlanCategory = useOrganizerStore(
    (s) => s.addPlaysToGamePlanCategory,
  );
  const updateGamePlanEntry = useOrganizerStore((s) => s.updateGamePlanEntry);
  const removeGamePlanEntry = useOrganizerStore((s) => s.removeGamePlanEntry);
  const reorderGamePlanEntry = useOrganizerStore((s) => s.reorderGamePlanEntry);
  const createPracticeSessionFromGamePlan = useOrganizerStore(
    (s) => s.createPracticeSessionFromGamePlan,
  );
  const createPlayerHomeworkFromGamePlan = useOrganizerStore(
    (s) => s.createPlayerHomeworkFromGamePlan,
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [addPlayCategory, setAddPlayCategory] = useState<GamePlanCategoryId | null>(
    null,
  );
  const [suggestCategory, setSuggestCategory] = useState<GamePlanCategoryId | null>(
    null,
  );
  const [benchPrintOpen, setBenchPrintOpen] = useState(false);
  const [gameDayOpen, setGameDayOpen] = useState(false);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);

  const sortedPlans = useMemo(() => sortGamePlans(gamePlans), [gamePlans]);
  const visiblePlans = useMemo(
    () =>
      sortedPlans.filter((plan) =>
        showArchived ? plan.status === "archived" : plan.status !== "archived",
      ),
    [showArchived, sortedPlans],
  );
  const pageCount = Math.max(1, Math.ceil(visiblePlans.length / PAGE_SIZE));
  const pageItems = visiblePlans.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const selected = gamePlans.find((plan) => plan.id === selectedId) ?? null;
  const playMap = useMemo(
    () => new Map(plays.map((play) => [play.id, play])),
    [plays],
  );
  const groupedEntries = useMemo(
    () => (selected ? groupGamePlanEntries(selected.entries) : []),
    [selected],
  );
  const selectedEntry = selected?.entries.find((entry) => entry.id === selectedEntryId);
  const selectedPlay = selectedEntry?.playId
    ? playMap.get(selectedEntry.playId) ?? null
    : null;

  const excludedPlayIds = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      selected.entries.map((entry) => entry.playId).filter(Boolean) as string[],
    );
  }, [selected]);

  const opponentHistory = useMemo(() => {
    if (!selected) return [];
    return findOpponentHistory(gamePlans, selected.opponent, {
      excludeId: selected.id,
      limit: 3,
    });
  }, [gamePlans, selected]);

  const planHomework = useMemo(
    () => (selected ? homeworkForGamePlan(playerHomework, selected.id) : []),
    [playerHomework, selected],
  );
  const activeHomework =
    planHomework.find((row) => row.status === "open") ?? planHomework[0] ?? null;

  useEffect(() => {
    if (!selected) {
      setSelectedEntryId(null);
      return;
    }
    if (
      selectedEntryId &&
      selected.entries.some((entry) => entry.id === selectedEntryId)
    ) {
      return;
    }
    setSelectedEntryId(selected.entries[0]?.id ?? null);
  }, [selected, selectedEntryId]);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  async function handleCreate() {
    const opponent = await appPrompt({
      title: "New game plan",
      label: "Opponent",
      placeholder: "e.g. Panathinaikos U18",
      submitLabel: "Create",
    });
    if (!opponent?.trim()) return;
    const plan = await createGamePlan(opponent.trim(), teams[0] || "No Team");
    setSelectedId(plan.id);
    setShowArchived(false);
  }

  async function handleEditOpponent() {
    if (!selected) return;
    const opponent = await appPrompt({
      title: "Opponent",
      label: "Opponent name",
      initialValue: selected.opponent,
      submitLabel: "Save",
    });
    if (!opponent?.trim()) return;
    await updateGamePlan(selected.id, {
      opponent: opponent.trim(),
      title: `vs ${opponent.trim()}`,
    });
  }

  async function handleEditDate() {
    if (!selected) return;
    const date = await appPrompt({
      title: "Game date",
      label: "Date (YYYY-MM-DD)",
      initialValue: selected.gameDate,
      submitLabel: "Save",
    });
    if (!date?.trim()) return;
    await updateGamePlan(selected.id, { gameDate: date.trim() });
  }

  async function handleEditScouting() {
    if (!selected) return;
    const notes = await appPrompt({
      title: "Scouting keys",
      label: "Keys / tendencies",
      initialValue: selected.scoutingNotes || "",
      submitLabel: "Save",
      multiline: true,
    });
    if (notes == null) return;
    await updateGamePlan(selected.id, { scoutingNotes: notes });
  }

  async function handleEditCallName(entryId: string) {
    if (!selected) return;
    const entry = selected.entries.find((row) => row.id === entryId);
    if (!entry) return;
    const play = entry.playId ? playMap.get(entry.playId) : undefined;
    const callName = await appPrompt({
      title: "Call name",
      label: "Bench call (optional)",
      initialValue: entry.callName || play?.title || "",
      submitLabel: "Save",
    });
    if (callName == null) return;
    await updateGamePlanEntry(selected.id, entryId, {
      callName: callName.trim() || undefined,
    });
  }

  async function handleDeletePlan(planId: string) {
    const plan = gamePlans.find((row) => row.id === planId);
    if (!plan) return;
    const ok = await appConfirm({
      title: "Delete game plan",
      message: `Delete "${plan.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await deleteGamePlan(planId);
    if (selectedId === planId) setSelectedId(null);
  }

  async function handleDuplicate(planId: string) {
    const copy = await duplicateGamePlanById(planId);
    if (!copy) return;
    setSelectedId(copy.id);
    setShowArchived(false);
    appNotice("Game plan", "Created a copy.");
  }

  async function handleEditPostGameNotes() {
    if (!selected) return;
    const notes = await appPrompt({
      title: "Post-game notes",
      label: "What worked, what to change next time",
      initialValue: selected.postGameNotes || "",
      submitLabel: "Save",
      multiline: true,
      allowEmpty: true,
    });
    if (notes == null) return;
    await updateGamePlan(selected.id, { postGameNotes: notes });
  }

  async function handleRematch(planId?: string) {
    const sourceId = planId || selected?.id;
    if (!sourceId) return;
    const source = gamePlans.find((plan) => plan.id === sourceId);
    if (!source) return;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    const gameDate = await appPrompt({
      title: "Rematch",
      label: "Next game date (YYYY-MM-DD)",
      initialValue: defaultDate.toISOString().slice(0, 10),
      submitLabel: "Create rematch",
    });
    if (!gameDate?.trim()) return;
    const rematch = await createRematchGamePlanById(sourceId, gameDate.trim());
    if (!rematch) return;
    setSelectedId(rematch.id);
    setShowArchived(false);
    appNotice("Rematch", `Created "${rematch.title}" for ${formatGamePlanDate(rematch.gameDate)}.`);
  }

  async function handleStatusChange(status: GamePlanStatus) {
    if (!selected) return;
    if (status === "archived") {
      const notes = await appPrompt({
        title: "Archive game plan",
        label: "Post-game notes (optional)",
        initialValue: selected.postGameNotes || "",
        submitLabel: "Archive",
        multiline: true,
        allowEmpty: true,
      });
      if (notes == null) return;
      await updateGamePlan(selected.id, {
        status: "archived",
        postGameNotes: notes.trim() || undefined,
      });
      setShowArchived(true);
      return;
    }
    await setGamePlanStatus(selected.id, status);
    if (status === "draft") setShowArchived(false);
  }

  function handleAddPlays(playIds: string[]) {
    if (!selected || !addPlayCategory || !playIds.length) return;
    void addPlaysToGamePlanCategory(selected.id, addPlayCategory, playIds);
    setAddPlayCategory(null);
  }

  function handleSuggestAdd(playIds: string[]) {
    if (!selected || !suggestCategory || !playIds.length) return;
    void addPlaysToGamePlanCategory(selected.id, suggestCategory, playIds);
    setSuggestCategory(null);
  }

  async function handleShareLink() {
    if (!selected || !canPrintBench) return;
    const result = buildSmartGamePlanUrl(selected, plays);
    await copyShareResult(result, selected.title || "Game plan");
  }

  async function handleStaffLink() {
    if (!selected || !canPrintBench) return;
    const result = buildSmartGameDayUrl(
      selected,
      plays,
      DEFAULT_SHARE_STAGE,
      selected.gameDay?.activeCategoryId,
    );
    await copyShareResult(result, "Staff live view");
  }

  function handleOpenGameDay() {
    if (!selected || !canPrintBench) return;
    setGameDayOpen(true);
  }

  async function handleCreateHomework() {
    if (!selected || !canPrintBench) return;
    const assignment = await createPlayerHomeworkFromGamePlan(selected.id);
    if (!assignment) {
      appNotice("Player homework", "Add plays to the game plan first.");
      return;
    }
    appNotice(
      "Player homework",
      "Assignment created. Send the study link to your roster below.",
    );
  }

  async function handlePrepPractice() {
    if (!selected || !canPrintBench) return;
    const prepDate = computePrepPracticeDate(selected.gameDate);
    const ok = await appConfirm({
      title: "Prep practice",
      message: `Create a practice session for ${prepDate} with all ${gamePlanEntryCount(selected)} plays from this game plan?`,
      confirmLabel: "Create session",
    });
    if (!ok) return;
    const session = await createPracticeSessionFromGamePlan(selected.id);
    if (!session) {
      appNotice("Prep practice", "Could not create practice session.");
      return;
    }
    appNotice("Prep practice", `"${session.title}" was added to Practice.`);
    router.push(`/library?tab=practice&session=${session.id}`);
  }

  const canPrintBench = !!selected && gamePlanEntryCount(selected) > 0;

  return (
    <>
      <div className="fc-game-plan-shell" id="fc-game-plan-shell">
        <aside className="fc-game-plan-sidebar" aria-label="Game plans">
          <div className="fc-game-plan-sidebar-toolbar">
            <button
              type="button"
              className="fc-game-plan-create-btn"
              onClick={() => void handleCreate()}
            >
              NEW GAME PLAN
            </button>
            <button
              type="button"
              className={`fc-game-plan-filter-btn${showArchived ? " active" : ""}`}
              onClick={() => setShowArchived((value) => !value)}
            >
              {showArchived ? "SHOW ACTIVE" : "ARCHIVED"}
            </button>
          </div>
          <div className="fc-game-plan-sidebar-list" role="listbox">
            {!visiblePlans.length ? (
              <div className="fc-game-plan-sidebar-empty">
                {showArchived
                  ? "No archived game plans."
                  : "No game plans yet. Create one for your next opponent."}
              </div>
            ) : (
              pageItems.map((plan) => {
                const count = gamePlanEntryCount(plan);
                const upcoming = isGamePlanUpcoming(plan);
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className={`fc-game-plan-sidebar-item${selectedId === plan.id ? " selected" : ""}`}
                    role="option"
                    aria-selected={selectedId === plan.id}
                    onClick={() => setSelectedId(plan.id)}
                  >
                    <span className="fc-game-plan-sidebar-item-main">
                      <span className="fc-game-plan-sidebar-item-name">
                        {plan.title}
                      </span>
                      <span className="fc-game-plan-sidebar-item-meta">
                        {formatGamePlanDate(plan.gameDate)}
                        {upcoming ? " · upcoming" : ""}
                      </span>
                    </span>
                    <span className={`fc-game-plan-status fc-game-plan-status-${plan.status}`}>
                      {gamePlanStatusLabel(plan.status)}
                    </span>
                    <span className="fc-game-plan-sidebar-item-count">{count}</span>
                  </button>
                );
              })
            )}
          </div>
          {visiblePlans.length > PAGE_SIZE ? (
            <div className="fc-game-plan-sidebar-footer fd-table-footer">
              <button
                type="button"
                className="fd-page-btn"
                disabled={page <= 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Prev
              </button>
              <span className="fd-page-info">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="fd-page-btn"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </aside>

        <section className="fc-game-plan-main" aria-label="Game plan editor">
          {!selected ? (
            <div className="fc-game-plan-main-empty">
              <p>Select a game plan or create one for your next opponent.</p>
            </div>
          ) : (
            <>
              <header className="fc-game-plan-main-header">
                <div className="fc-game-plan-main-heading">
                  <h2 className="fc-game-plan-main-title">{selected.title}</h2>
                  <p className="fc-game-plan-main-meta">
                    {formatGamePlanDate(selected.gameDate)}
                    {formatGamePlanHomeAway(selected.homeAway)
                      ? ` · ${formatGamePlanHomeAway(selected.homeAway)}`
                      : ""}
                    {selected.team && selected.team !== "No Team"
                      ? ` · ${selected.team}`
                      : ""}
                  </p>
                </div>
                <div className="fc-game-plan-main-actions">
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleEditOpponent()}
                  >
                    Opponent
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleEditDate()}
                  >
                    Date
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleEditScouting()}
                  >
                    Keys
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleRematch()}
                  >
                    Rematch
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleEditPostGameNotes()}
                  >
                    Post-game
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    onClick={() => void handleDuplicate(selected.id)}
                  >
                    Duplicate
                  </button>
                  {selected.status !== "ready" ? (
                    <button
                      type="button"
                      className="fc-game-plan-action-btn"
                      onClick={() => void handleStatusChange("ready")}
                    >
                      Mark ready
                    </button>
                  ) : null}
                  {selected.status !== "archived" ? (
                    <button
                      type="button"
                      className="fc-game-plan-action-btn"
                      onClick={() => void handleStatusChange("archived")}
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="fc-game-plan-action-btn"
                      onClick={() => void handleStatusChange("draft")}
                    >
                      Restore
                    </button>
                  )}
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    disabled={!canPrintBench}
                    onClick={handleOpenGameDay}
                  >
                    Game day
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    disabled={!canPrintBench}
                    onClick={() => void handleStaffLink()}
                  >
                    Staff link
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    disabled={!canPrintBench}
                    onClick={() => void handleShareLink()}
                  >
                    Share link
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    disabled={!canPrintBench}
                    onClick={() => void handleCreateHomework()}
                  >
                    Player homework
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn"
                    disabled={!canPrintBench}
                    onClick={() => void handlePrepPractice()}
                  >
                    Prep practice
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-action-btn danger"
                    onClick={() => void handleDeletePlan(selected.id)}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    className="fc-game-plan-bench-btn"
                    disabled={!canPrintBench}
                    onClick={() => setBenchPrintOpen(true)}
                    title="Bench card PDF"
                  >
                    <PrintPreviewIcon />
                    Bench card
                  </button>
                </div>
              </header>

              {selected.scoutingNotes?.trim() ? (
                <div className="fc-game-plan-scouting-notes">
                  <strong>Keys</strong>
                  <p>{selected.scoutingNotes.trim()}</p>
                </div>
              ) : null}

              {selected.postGameNotes?.trim() ? (
                <div className="fc-game-plan-postgame-notes">
                  <strong>Post-game</strong>
                  <p>{selected.postGameNotes.trim()}</p>
                </div>
              ) : null}

              {opponentHistory.length ? (
                <section className="fc-game-plan-opponent-history" aria-label="Opponent history">
                  <h3 className="fc-game-plan-opponent-history-title">
                    Previous vs {selected.opponent}
                  </h3>
                  <ul className="fc-game-plan-opponent-history-list">
                    {opponentHistory.map((plan) => (
                      <li key={plan.id} className="fc-game-plan-opponent-history-row">
                        <button
                          type="button"
                          className="fc-game-plan-opponent-history-open"
                          onClick={() => setSelectedId(plan.id)}
                        >
                          <span className="fc-game-plan-opponent-history-date">
                            {formatGamePlanDate(plan.gameDate)}
                          </span>
                          <span className="fc-game-plan-opponent-history-meta">
                            {gamePlanEntryCount(plan)} plays · {gamePlanStatusLabel(plan.status)}
                          </span>
                          {plan.postGameNotes?.trim() ? (
                            <span className="fc-game-plan-opponent-history-note">
                              {plan.postGameNotes.trim()}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          className="fc-game-plan-opponent-history-rematch"
                          onClick={() => void handleRematch(plan.id)}
                        >
                          Rematch
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {activeHomework && selected ? (
                <GamePlanHomeworkPanel plan={selected} assignment={activeHomework} />
              ) : null}

              <div className="fc-game-plan-detail-split">
                <div className="fc-game-plan-categories-pane">
                  {groupedEntries.map((group) => (
                    <section key={group.categoryId} className="fc-game-plan-category">
                      <div className="fc-game-plan-category-head">
                        <h3>{group.label}</h3>
                        <div className="fc-game-plan-category-actions">
                          <button
                            type="button"
                            className="fc-game-plan-suggest-btn"
                            onClick={() => setSuggestCategory(group.categoryId)}
                          >
                            Suggest
                          </button>
                          <button
                            type="button"
                            className="fc-game-plan-add-play-btn"
                            onClick={() => setAddPlayCategory(group.categoryId)}
                          >
                            + Add play
                          </button>
                        </div>
                      </div>
                      {group.entries.length ? (
                        <ul className="fc-game-plan-entry-list">
                          {group.entries.map((entry, index) => {
                            const play = entry.playId
                              ? playMap.get(entry.playId)
                              : undefined;
                            const label = resolveGamePlanEntryLabel(entry, play);
                            const isSelected = selectedEntryId === entry.id;
                            return (
                              <li
                                key={entry.id}
                                className={`fc-game-plan-entry-row${isSelected ? " selected" : ""}`}
                              >
                                <button
                                  type="button"
                                  className="fc-game-plan-entry-select"
                                  onClick={() => setSelectedEntryId(entry.id)}
                                >
                                  <span className="fc-game-plan-entry-index">
                                    {index + 1}.
                                  </span>
                                  <span className="fc-game-plan-entry-label">{label}</span>
                                </button>
                                <div className="fc-game-plan-entry-tools">
                                  <button
                                    type="button"
                                    className="fc-game-plan-entry-tool"
                                    title="Edit call name"
                                    onClick={() => void handleEditCallName(entry.id)}
                                  >
                                    Call
                                  </button>
                                  <button
                                    type="button"
                                    className="fc-game-plan-entry-tool"
                                    disabled={index <= 0}
                                    onClick={() =>
                                      void reorderGamePlanEntry(
                                        selected.id,
                                        entry.id,
                                        "up",
                                      )
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    className="fc-game-plan-entry-tool"
                                    disabled={index >= group.entries.length - 1}
                                    onClick={() =>
                                      void reorderGamePlanEntry(
                                        selected.id,
                                        entry.id,
                                        "down",
                                      )
                                    }
                                  >
                                    ↓
                                  </button>
                                  <button
                                    type="button"
                                    className="fc-game-plan-entry-tool danger"
                                    onClick={() =>
                                      void removeGamePlanEntry(selected.id, entry.id)
                                    }
                                  >
                                    ✕
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="fc-game-plan-category-empty">No plays yet.</p>
                      )}
                    </section>
                  ))}
                </div>

                <div className="fc-game-plan-preview-pane">
                  {selectedPlay ? (
                    <>
                      <div className="fc-game-plan-preview-toolbar">
                        <h3>{resolveGamePlanEntryLabel(selectedEntry!, selectedPlay)}</h3>
                        <button
                          type="button"
                          className="fc-game-plan-present-btn"
                          onClick={() => setPresentPlay(selectedPlay)}
                        >
                          Present
                        </button>
                      </div>
                      <div className="fc-game-plan-preview-court">
                        <CourtFrameThumbnail
                          frame={selectedPlay.frames[0]}
                          courtType={selectedPlay.courtType}
                          size="sm"
                          courtView={selectedPlay.courtView}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="fc-game-plan-preview-empty">
                      <p>Add plays by category, then select one to preview.</p>
                      <p className="fc-game-plan-preview-hint">
                        Categories: {GAME_PLAN_CATEGORIES.map((row) => row.label).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {addPlayCategory ? (
        <AddPlayToPlaybookModal
          open
          playbookName={selected?.title || "Game plan"}
          excludedPlayIds={excludedPlayIds}
          onClose={() => setAddPlayCategory(null)}
          onAdd={handleAddPlays}
        />
      ) : null}

      {suggestCategory ? (
        <GamePlanSuggestModal
          open
          categoryId={suggestCategory}
          plays={plays}
          excludedPlayIds={excludedPlayIds}
          onClose={() => setSuggestCategory(null)}
          onAdd={handleSuggestAdd}
        />
      ) : null}

      {benchPrintOpen && selected ? (
        <GamePlanBenchPrintOverlay
          plan={selected}
          playsById={playMap}
          onClose={() => setBenchPrintOpen(false)}
        />
      ) : null}

      {gameDayOpen && selected ? (
        <GameDayOverlay
          plan={selected}
          plays={plays}
          onClose={() => setGameDayOpen(false)}
        />
      ) : null}

      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
    </>
  );
}
