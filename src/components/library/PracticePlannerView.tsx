"use client";

import { useEffect, useMemo, useState } from "react";
import { PracticeAddModal } from "@/components/library/PracticeAddModal";
import { PracticeItemRow } from "@/components/library/PracticeItemRow";
import { PracticeLiveOverlay } from "@/components/library/PracticeLiveOverlay";
import { PracticeTemplateModal } from "@/components/library/PracticeTemplateModal";
import {
  buildPracticeShareItems,
  getPracticeSessionTotalMinutes,
  isPracticeBlockRunnable,
  resolvePracticeSessionItems,
} from "@/lib/practice/practice-items";
import { PracticePrintOverlay } from "@/components/library/PracticePrintOverlay";
import {
  saveCustomPracticeTemplate,
  templateFromSession,
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
import type { PracticeSession, PracticeTemplate } from "@/types/library-meta";

export function PracticePlannerView() {
  const sessions = useOrganizerStore((s) => s.practiceSessions);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const createPracticeSessionFromTemplate = useOrganizerStore(
    (s) => s.createPracticeSessionFromTemplate,
  );
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const deletePracticeSession = useOrganizerStore((s) => s.deletePracticeSession);
  const addPracticeItems = useOrganizerStore((s) => s.addPracticeItems);
  const addPracticeCueBlock = useOrganizerStore((s) => s.addPracticeCueBlock);
  const updatePracticeItem = useOrganizerStore((s) => s.updatePracticeItem);
  const removePracticeItem = useOrganizerStore((s) => s.removePracticeItem);
  const reorderPracticeItems = useOrganizerStore((s) => s.reorderPracticeItems);
  const movePracticeItem = useOrganizerStore((s) => s.movePracticeItem);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [liveSession, setLiveSession] = useState<PracticeSession | null>(null);
  const [printTarget, setPrintTarget] = useState<{
    session: PracticeSession;
    rows: ReturnType<typeof resolvePracticeSessionItems>;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const playById = useMemo(() => new Map(plays.map((p) => [p.id, p])), [plays]);
  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const rows = useMemo(
    () =>
      selected ? resolvePracticeSessionItems(selected, playById) : [],
    [selected, playById],
  );
  const runnableCount = rows.filter(isPracticeBlockRunnable).length;
  const totalMin = getPracticeSessionTotalMinutes(selected);
  const existingPlayIds = useMemo(
    () => new Set(selected?.items.map((i) => i.playId).filter(Boolean) as string[]),
    [selected],
  );

  useEffect(() => {
    if (!selectedId && sessions.length) setSelectedId(sessions[0].id);
  }, [sessions, selectedId]);

  async function handleNewSession() {
    const session = await createPracticeSession();
    setSelectedId(session.id);
  }

  async function handleFromTemplate(template: PracticeTemplate) {
    const session = await createPracticeSessionFromTemplate(template);
    setSelectedId(session.id);
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
    appNotice(
      "Template saved",
      `"${name}" was saved to your templates.`,
    );
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
      submitLabel: "Add block",
    });
    if (label === null) return;
    await addPracticeCueBlock(selected.id, label);
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
      <div className="practice-toolbar fd-filter-bar">
        <div className="practice-toolbar-left">
          <h2 className="practice-toolbar-title">Practice planner</h2>
          <p className="practice-toolbar-sub">
            Plan sessions, drag to reorder blocks, use templates, and run live in
            the gym.
          </p>
        </div>
        <div className="practice-toolbar-actions">
          <button
            type="button"
            className="org-export-all-btn fd-create-play-btn"
            id="btn-practice-new-session"
            onClick={() => void handleNewSession()}
          >
            + New session
          </button>
          <button
            type="button"
            className="org-export-all-btn"
            id="btn-practice-from-template"
            onClick={() => setTemplateOpen(true)}
          >
            📋 From template
          </button>
          <button
            type="button"
            className="org-export-all-btn practice-live-btn"
            id="btn-practice-start-live"
            disabled={!runnableCount}
            onClick={handleStartLive}
          >
            ▶ Start live
          </button>
          <button
            type="button"
            className="org-export-all-btn"
            id="btn-practice-share-link"
            disabled={!runnableCount}
            onClick={() => void handleShareLink()}
          >
            🔗 Share plan
          </button>
          <button
            type="button"
            className="org-export-all-btn practice-export-btn"
            id="btn-practice-export-pdf"
            disabled={!runnableCount}
            onClick={handleExportPdf}
          >
            📄 Session PDF
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
                    className={`practice-session-card${selectedId === session.id ? " active" : ""}`}
                    onClick={() => setSelectedId(session.id)}
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
                    id="btn-practice-add-items"
                    onClick={() => setAddOpen(true)}
                  >
                    + Add from library
                  </button>
                </div>
              </div>

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
                      onDragStart={() => setDragIndex(row.index)}
                      onDragOver={(e) => e.preventDefault()}
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
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      onUpdate={(patch) =>
                        updatePracticeItem(selected.id, row.item.id, patch)
                      }
                      onMove={(direction) =>
                        movePracticeItem(selected.id, row.item.id, direction)
                      }
                      onRemove={() =>
                        removePracticeItem(selected.id, row.item.id)
                      }
                    />
                  ))
                )}
              </div>

              <div className="practice-editor-footer">
                <button
                  type="button"
                  className="practice-save-template-btn"
                  id="btn-practice-save-template"
                  onClick={handleOpenSaveTemplate}
                >
                  Save as template
                </button>
                <button
                  type="button"
                  className="org-export-all-btn"
                  id="btn-practice-share-players"
                  disabled={!selected.items.length}
                  onClick={handleSendToPlayers}
                >
                  Send to players
                </button>
                <button
                  type="button"
                  className="practice-delete-session-btn"
                  id="btn-practice-delete-session"
                  onClick={() => void handleOpenDeleteSession()}
                >
                  Delete session
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

      <PracticeTemplateModal
        open={templateOpen}
        onClose={() => setTemplateOpen(false)}
        onSelect={(template) => void handleFromTemplate(template)}
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
