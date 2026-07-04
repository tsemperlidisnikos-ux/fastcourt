"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PracticeAddModal } from "@/components/library/PracticeAddModal";
import { PracticeAddPlaybookModal } from "@/components/library/PracticeAddPlaybookModal";
import { PracticeReadScorecardPanel } from "@/components/library/PracticeReadScorecardPanel";
import { PracticeItemRow } from "@/components/library/PracticeItemRow";
import { PracticeLiveOverlay } from "@/components/library/PracticeLiveOverlay";
import {
  buildPracticeShareItems,
  getPracticeSessionTotalMinutes,
  isPracticeBlockRunnable,
  isPracticeItemMissing,
  resolvePracticeSessionItems,
} from "@/lib/practice/practice-items";
import { PracticePrintOverlay } from "@/components/library/PracticePrintOverlay";
import {
  saveCustomPracticeTemplate,
  templateFromSession,
  updateCustomPracticeTemplate,
} from "@/lib/practice/templates";
import { shareContentToPlayers } from "@/lib/players/share-to-players";
import {
  buildSmartPracticeUrl,
  copyShareResult,
} from "@/lib/share/share-link";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  appConfirm,
  appNotice,
  appPrompt,
} from "@/stores/dialog-store";
import type { PracticeSession } from "@/types/library-meta";

export function PracticePlannerView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessions = useOrganizerStore((s) => s.practiceSessions);
  const plays = useOrganizerStore((s) => s.plays);
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const teams = useOrganizerStore((s) => s.teams);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const duplicatePracticeSession = useOrganizerStore((s) => s.duplicatePracticeSession);
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const deletePracticeSession = useOrganizerStore((s) => s.deletePracticeSession);
  const addPracticeItems = useOrganizerStore((s) => s.addPracticeItems);
  const addPlaybookToSession = useOrganizerStore((s) => s.addPlaybookToSession);
  const addPracticeCueBlock = useOrganizerStore((s) => s.addPracticeCueBlock);
  const updatePracticeItem = useOrganizerStore((s) => s.updatePracticeItem);
  const removePracticeItem = useOrganizerStore((s) => s.removePracticeItem);
  const reorderPracticeItems = useOrganizerStore((s) => s.reorderPracticeItems);
  const movePracticeItem = useOrganizerStore((s) => s.movePracticeItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [replaceItemId, setReplaceItemId] = useState<string | null>(null);
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [liveSession, setLiveSession] = useState<PracticeSession | null>(null);
  const [printTarget, setPrintTarget] = useState<{
    session: PracticeSession;
    rows: ReturnType<typeof resolvePracticeSessionItems>;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<{
    id: string;
    name: string;
    createdAt?: string;
    sessionId: string;
  } | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (!sessionId || !sessions.some((s) => s.id === sessionId)) return;
    const selectTimer = window.setTimeout(() => setSelectedId(sessionId), 0);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("session");
    const qs = params.toString();
    router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
    return () => window.clearTimeout(selectTimer);
  }, [router, searchParams, sessions]);

  const playById = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const activeSessionId = selectedId ?? sessions[0]?.id ?? null;
  const selected = sessions.find((s) => s.id === activeSessionId) ?? null;
  const rows = useMemo(
    () =>
      selected ? resolvePracticeSessionItems(selected, playById) : [],
    [selected, playById],
  );
  const runnableCount = rows.filter(isPracticeBlockRunnable).length;
  const missingCount = rows.filter(isPracticeItemMissing).length;
  const totalMin = getPracticeSessionTotalMinutes(selected);
  const existingPlayIds = useMemo(
    () => new Set(selected?.items.map((i) => i.playId).filter(Boolean) as string[]),
    [selected],
  );

  async function handleNewSession() {
    const session = await createPracticeSession();
    setEditingTemplate(null);
    setSelectedId(session.id);
  }

  function selectSession(id: string) {
    setSelectedId(id);
    if (editingTemplate && editingTemplate.sessionId !== id) {
      setEditingTemplate(null);
    }
  }

  function patchSession(patch: Partial<PracticeSession>) {
    if (!selected) return;
    void updatePracticeSession(selected.id, patch);
  }

  async function handleOpenSaveTemplate() {
    if (!selected?.items.length) {
      appNotice(
        "Nothing to save",
        "Add at least one block before saving a template.",
      );
      return;
    }
    const name = await appPrompt({
      title: "Save as template",
      subtitle: "Reuse this session plan in future practices.",
      label: "Template name",
      initialValue: selected.title || "My template",
      placeholder: "e.g. Monday offense template",
      submitLabel: "Save template",
    });
    if (name === null) return;
    await saveCustomPracticeTemplate(templateFromSession(selected, name));
    setEditingTemplate(null);
    appNotice(
      "Template saved",
      `"${name}" was saved to your templates.`,
    );
  }

  async function handleUpdateTemplate() {
    if (!selected || !editingTemplate) return;
    if (!selected.items.length) {
      appNotice(
        "Nothing to save",
        "Add at least one block before updating the template.",
      );
      return;
    }
    const name = await appPrompt({
      title: "Update template",
      subtitle: "Save changes to this saved template.",
      label: "Template name",
      initialValue: editingTemplate.name,
      placeholder: "e.g. Monday offense template",
      submitLabel: "Update template",
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      appNotice("Name required", "Enter a template name.");
      return;
    }
    const template = templateFromSession(selected, trimmed, {
      id: editingTemplate.id,
      createdAt: editingTemplate.createdAt,
    });
    const ok = await updateCustomPracticeTemplate(template);
    if (!ok) {
      appNotice("Update failed", "Could not update this template.");
      return;
    }
    setEditingTemplate({
      id: template.id,
      name: template.name,
      createdAt: template.createdAt,
      sessionId: editingTemplate.sessionId,
    });
    appNotice("Template updated", `"${trimmed}" was updated.`);
  }

  function handleReplaceMissingPlay(playIds: string[]) {
    const playId = playIds[0];
    if (!selected || !replaceItemId || !playId) return;
    void updatePracticeItem(selected.id, replaceItemId, {
      playId,
      cueLabel: undefined,
    });
    setReplaceItemId(null);
  }

  function handleSendToPlayers() {
    if (!selected?.items.length) {
      appNotice(
        "Empty session",
        "Add at least one block to the practice session first.",
      );
      return;
    }
    shareContentToPlayers({
      kind: "practice",
      session: selected,
      playsById: playById,
    });
  }

  async function handleOpenAddCueBlock() {
    if (!selected) return;
    const label = await appPrompt({
      title: "Add block",
      subtitle: "Add a timed block without linking a library play.",
      label: "Block name",
      placeholder: "e.g. Dynamic warm-up",
      submitLabel: "Next",
    });
    if (label === null) return;
    const durationRaw = await appPrompt({
      title: "Block duration",
      subtitle: "How many minutes for this block?",
      label: "Minutes",
      initialValue: "10",
      placeholder: "10",
      submitLabel: "Add block",
    });
    if (durationRaw === null) return;
    const durationMin = Math.max(1, Number(durationRaw) || 10);
    await addPracticeCueBlock(selected.id, label, durationMin);
  }

  async function handleDuplicateSession() {
    if (!selected) return;
    const copy = await duplicatePracticeSession(selected.id);
    if (!copy) return;
    setEditingTemplate(null);
    setSelectedId(copy.id);
    appNotice("Session duplicated", `"${copy.title}" was created.`);
  }

  async function handleOpenDeleteSession() {
    if (!selected) return;
    const confirmed = await appConfirm({
      title: "Delete session",
      message: `Delete "${selected.title || "Practice"}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await deletePracticeSession(selected.id);
    setSelectedId(null);
  }

  async function handleShareLink() {
    if (!selected || !runnableCount) return;
    const items = buildPracticeShareItems(selected, playById);
    const result = buildSmartPracticeUrl(selected, items);
    await copyShareResult(result, selected.title || "Practice");
  }

  function handleExportPdf() {
    if (!selected || !runnableCount) return;
    setPrintTarget({
      session: selected,
      rows: rows.filter(isPracticeBlockRunnable),
    });
  }

  function handleStartLive() {
    if (!selected || !runnableCount) return;
    setLiveSession(selected);
  }

  return (
    <div className="org-practice-shell" id="org-practice-shell">
      <div className="practice-toolbar fd-filter-bar fc-organizer-section-toolbar">
        <div className="practice-toolbar-left">
          <h2 className="practice-toolbar-title">Practice planner</h2>
        </div>
        <div className="practice-toolbar-actions">
          <button
            type="button"
            className="fc-organizer-create-btn"
            id="btn-practice-new-session"
            onClick={() => void handleNewSession()}
          >
            ADD SESSION
          </button>
          <button
            type="button"
            className="org-export-all-btn practice-live-btn"
            id="btn-practice-start-live"
            hidden
            disabled={!runnableCount}
            onClick={handleStartLive}
          >
            ▶ Start live
          </button>
          <button
            type="button"
            className="org-export-all-btn"
            id="btn-practice-share-link"
            hidden
            disabled={!runnableCount}
            onClick={() => void handleShareLink()}
          >
            🔗 Share plan
          </button>
        </div>
      </div>

      <div className="practice-layout">
        <aside className="practice-sessions-panel">
          <div className="practice-sessions-head">Sessions</div>
          <div className="practice-sessions-list" id="practice-sessions-list">
            {!sessions.length ? (
              <div className="practice-sessions-empty">
                No sessions yet.
                <br />
                Create one to plan your practice.
              </div>
            ) : (
              sessions.map((session) => {
                const sessionMin = getPracticeSessionTotalMinutes(session);
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`practice-session-card${activeSessionId === session.id ? " active" : ""}`}
                    onClick={() => selectSession(session.id)}
                  >
                    <div className="practice-session-card-date">{session.date}</div>
                    <div className="practice-session-card-title">
                      {session.title || "Practice"}
                    </div>
                    <div className="practice-session-card-meta">
                      {session.items.length} block
                      {session.items.length !== 1 ? "s" : ""}
                      {sessionMin ? ` · ${sessionMin} min` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="practice-editor-panel" id="practice-editor-panel">
          {!selected ? (
            <div className="practice-editor-empty" id="practice-editor-empty">
              Select a session or create a new one.
            </div>
          ) : (
            <div className="practice-editor-form" id="practice-editor-form">
              <div className="practice-editor-fields">
                <label className="practice-field">
                  <span>Date</span>
                  <input
                    type="date"
                    id="practice-session-date"
                    value={selected.date}
                    onChange={(e) => patchSession({ date: e.target.value })}
                  />
                </label>
                <label className="practice-field practice-field-grow">
                  <span>Title</span>
                  <input
                    type="text"
                    id="practice-session-title"
                    value={selected.title}
                    placeholder="e.g. Monday — Offense & transition"
                    onChange={(e) => patchSession({ title: e.target.value })}
                  />
                </label>
                <label className="practice-field">
                  <span>Team</span>
                  <select
                    id="practice-session-team"
                    value={selected.team}
                    onChange={(e) => patchSession({ team: e.target.value })}
                  >
                    {teams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="practice-field practice-field-block">
                <span>Session notes</span>
                <textarea
                  id="practice-session-notes"
                  rows={2}
                  value={selected.notes ?? ""}
                  placeholder="Focus, goals, reminders for staff…"
                  onChange={(e) => patchSession({ notes: e.target.value })}
                />
              </label>

              {editingTemplate && selected.id === editingTemplate.sessionId ? (
                <div
                  className="practice-editing-template-banner"
                  id="practice-editing-template-banner"
                >
                  <span>
                    Editing template: <strong>{editingTemplate.name}</strong>
                  </span>
                  <button
                    type="button"
                    className="practice-editing-template-cancel"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Done editing
                  </button>
                </div>
              ) : null}

              <div className="practice-items-head">
                <span className="practice-items-summary">
                  Plan · <strong id="practice-items-count">{selected.items.length}</strong>{" "}
                  blocks ·{" "}
                  <strong className="practice-duration-total" id="practice-items-duration">
                    {totalMin} min
                  </strong>
                </span>
                <div className="practice-items-head-actions">
                  <button
                    type="button"
                    className="practice-add-items-btn"
                    id="btn-practice-add-cue"
                    onClick={handleOpenAddCueBlock}
                  >
                    + Add block
                  </button>
                  <button
                    type="button"
                    className="practice-add-items-btn"
                    id="btn-practice-add-playbook"
                    onClick={() => setPlaybookOpen(true)}
                  >
                    + Add playbook
                  </button>
                  <button
                    type="button"
                    className="practice-add-items-btn"
                    id="btn-practice-add-items"
                    onClick={() => setAddOpen(true)}
                  >
                    + Add from library
                  </button>
                </div>
              </div>

              {missingCount > 0 ? (
                <div className="practice-missing-banner" id="practice-missing-banner">
                  <span>
                    {missingCount} block{missingCount !== 1 ? "s" : ""} missing from
                    library — use <strong>Replace</strong> on each row to link a play.
                  </span>
                </div>
              ) : null}

              <PracticeReadScorecardPanel session={selected} allSessions={sessions} />

              <div className="practice-items-list" id="practice-items-list">
                {!rows.length ? (
                  <div className="practice-items-empty">
                    Add plays or drills from your library to build the session plan.
                  </div>
                ) : (
                  rows.map((row) => (
                    <PracticeItemRow
                      key={row.item.id}
                      row={row}
                      totalRows={rows.length}
                      dragIndex={dragIndex}
                      dropTargetIndex={dropTargetIndex}
                      onDragStart={() => setDragIndex(row.index)}
                      onDragOver={() => setDropTargetIndex(row.index)}
                      onDrop={() => {
                        if (
                          dragIndex != null &&
                          dragIndex !== row.index &&
                          selected
                        ) {
                          void reorderPracticeItems(
                            selected.id,
                            dragIndex,
                            row.index,
                          );
                        }
                        setDragIndex(null);
                        setDropTargetIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDropTargetIndex(null);
                      }}
                      onUpdate={(patch) =>
                        updatePracticeItem(selected.id, row.item.id, patch)
                      }
                      onMove={(direction) =>
                        movePracticeItem(selected.id, row.item.id, direction)
                      }
                      onRemove={() =>
                        removePracticeItem(selected.id, row.item.id)
                      }
                      onReplace={
                        isPracticeItemMissing(row)
                          ? () => setReplaceItemId(row.item.id)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>

              <div className="practice-editor-footer">
                <button
                  type="button"
                  className="practice-footer-btn"
                  id="btn-practice-duplicate-session"
                  onClick={() => void handleDuplicateSession()}
                >
                  Duplicate session
                </button>
                <button
                  type="button"
                  className="practice-footer-btn"
                  id="btn-practice-save-template"
                  onClick={handleOpenSaveTemplate}
                >
                  Save as template
                </button>
                {editingTemplate && selected.id === editingTemplate.sessionId ? (
                  <button
                    type="button"
                    className="practice-footer-btn"
                    id="btn-practice-update-template"
                    onClick={() => void handleUpdateTemplate()}
                  >
                    Update template
                  </button>
                ) : null}
                <button
                  type="button"
                  className="practice-footer-btn"
                  id="btn-practice-share-players"
                  disabled={!selected.items.length}
                  onClick={handleSendToPlayers}
                >
                  Send to players
                </button>
                <button
                  type="button"
                  className="practice-footer-btn"
                  id="btn-practice-delete-session"
                  onClick={() => void handleOpenDeleteSession()}
                >
                  Delete session
                </button>
                <button
                  type="button"
                  className="practice-footer-btn"
                  id="btn-practice-export-pdf"
                  disabled={!runnableCount}
                  onClick={handleExportPdf}
                >
                  Session PDF
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <PracticeAddModal
        open={addOpen}
        plays={plays}
        existingPlayIds={existingPlayIds}
        onClose={() => setAddOpen(false)}
        onConfirm={(playIds) => {
          if (selected) void addPracticeItems(selected.id, playIds);
        }}
      />

      <PracticeAddModal
        open={replaceItemId != null}
        mode="replace"
        plays={plays}
        onClose={() => setReplaceItemId(null)}
        onConfirm={handleReplaceMissingPlay}
      />

      <PracticeAddPlaybookModal
        open={playbookOpen}
        playbooks={playbooks}
        onClose={() => setPlaybookOpen(false)}
        onSelect={(playbookId) => {
          if (selected) void addPlaybookToSession(selected.id, playbookId);
        }}
      />

      {liveSession ? (
        <PracticeLiveOverlay
          session={liveSession}
          onClose={() => setLiveSession(null)}
        />
      ) : null}

      {printTarget ? (
        <PracticePrintOverlay
          session={printTarget.session}
          rows={printTarget.rows}
          onClose={() => setPrintTarget(null)}
        />
      ) : null}
    </div>
  );
}
