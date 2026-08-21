"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  COUNTER_LIBRARY_COVERAGE_OPTIONS,
  COUNTER_LIBRARY_VS_PATTERNS,
  COUNTER_COVERAGE_LABELS,
} from "@/lib/film-room/film-counter-playbook";
import { buildFilmRoomDeepLink } from "@/lib/film-room/film-game-plan-link";
import { buildDesignerHref } from "@/lib/designer/designer-deep-link";
import {
  TIMEOUT_CUES_MAX,
  addTimeoutCue,
  createManualTimeoutCue,
  listCounterLibraryPlays,
  patchTimeoutCue,
  removeTimeoutCue,
  sortTimeoutCues,
  timeoutCueCoverageLabel,
  timeoutCueFromCounterLibraryPlay,
  type ManualTimeoutCueInput,
} from "@/lib/game-plan/game-day-timeout-cues";
import { appConfirm, appNotice } from "@/stores/dialog-store";
import type { GamePlan, GamePlanTimeoutCue } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

interface Props {
  plan: GamePlan;
  plays: StoredPlay[];
  onUpdateCues: (timeoutCues: GamePlanTimeoutCue[]) => void | Promise<void>;
  onAddDefensePlay?: (playId: string) => void | Promise<void>;
}

type CueFormState = {
  title: string;
  detail: string;
  coverage: string;
  targetsPattern: string;
  trigger: string;
  ballHandlerRule: string;
  screenerRule: string;
  weakPoint: string;
  priority: "high" | "medium" | "low";
};

const EMPTY_FORM: CueFormState = {
  title: "",
  detail: "",
  coverage: "ice",
  targetsPattern: "PNR",
  trigger: "",
  ballHandlerRule: "",
  screenerRule: "",
  weakPoint: "",
  priority: "high",
};

function cueToForm(cue: GamePlanTimeoutCue): CueFormState {
  return {
    title: cue.title,
    detail: cue.detail,
    coverage: cue.coverage || "other",
    targetsPattern: cue.targetsPattern ?? "",
    trigger: cue.trigger ?? "",
    ballHandlerRule: cue.ballHandlerRule ?? "",
    screenerRule: cue.screenerRule ?? "",
    weakPoint: cue.weakPoint ?? "",
    priority: cue.priority ?? "medium",
  };
}

function formToInput(form: CueFormState): ManualTimeoutCueInput {
  return {
    title: form.title,
    detail: form.detail,
    coverage: form.coverage,
    targetsPattern: form.targetsPattern.trim() || undefined,
    trigger: form.trigger.trim() || undefined,
    ballHandlerRule: form.ballHandlerRule.trim() || undefined,
    screenerRule: form.screenerRule.trim() || undefined,
    weakPoint: form.weakPoint.trim() || undefined,
    priority: form.priority,
  };
}

export function GamePlanCountersPanel({
  plan,
  plays,
  onUpdateCues,
  onAddDefensePlay,
}: Props) {
  const cues = useMemo(
    () => sortTimeoutCues(plan.timeoutCues ?? []),
    [plan.timeoutCues],
  );
  const libraryPlays = useMemo(() => listCounterLibraryPlays(plays), [plays]);
  const playsById = useMemo(
    () => new Map(plays.map((play) => [play.id, play])),
    [plays],
  );

  const [mode, setMode] = useState<"idle" | "manual" | "library">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CueFormState>(EMPTY_FORM);
  const [libraryPlayId, setLibraryPlayId] = useState("");
  const [alsoAddToDefense, setAlsoAddToDefense] = useState(true);
  const atCap = cues.length >= TIMEOUT_CUES_MAX;

  const openManual = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMode("manual");
  };

  const openLibrary = () => {
    setEditingId(null);
    setLibraryPlayId(libraryPlays[0]?.id ?? "");
    setMode("library");
  };

  const openEdit = (cue: GamePlanTimeoutCue) => {
    setMode("idle");
    setEditingId(cue.id);
    setForm(cueToForm(cue));
  };

  const cancelForm = () => {
    setMode("idle");
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const saveManual = async () => {
    const cue = createManualTimeoutCue(formToInput(form));
    if (!cue) {
      appNotice("Timeout counters", "Title and detail are required.");
      return;
    }
    if (atCap) {
      appNotice(
        "Timeout counters",
        `Limit is ${TIMEOUT_CUES_MAX} counters per game plan.`,
      );
      return;
    }
    await onUpdateCues(addTimeoutCue(plan.timeoutCues, cue));
    cancelForm();
  };

  const saveLibrary = async () => {
    const play = libraryPlays.find((row) => row.id === libraryPlayId);
    if (!play) {
      appNotice("Timeout counters", "Pick a Counter Library play.");
      return;
    }
    const cue = timeoutCueFromCounterLibraryPlay(play);
    if (!cue) {
      appNotice("Timeout counters", "That play is not tagged as a counter.");
      return;
    }
    const before = cues.length;
    const next = addTimeoutCue(plan.timeoutCues, cue);
    if (next.length === before && before >= TIMEOUT_CUES_MAX) {
      appNotice(
        "Timeout counters",
        `Limit is ${TIMEOUT_CUES_MAX} counters per game plan.`,
      );
      return;
    }
    if (next.length === before) {
      appNotice(
        "Timeout counters",
        "That counter is already on this game plan.",
      );
      return;
    }
    await onUpdateCues(next);
    if (alsoAddToDefense && onAddDefensePlay) {
      await onAddDefensePlay(play.id);
    }
    cancelForm();
  };

  const saveEdit = async (cueId: string) => {
    const input = formToInput(form);
    if (!input.title.trim() || !input.detail.trim()) {
      appNotice("Timeout counters", "Title and detail are required.");
      return;
    }
    await onUpdateCues(
      patchTimeoutCue(plan.timeoutCues, cueId, {
        ...input,
      }),
    );
    cancelForm();
  };

  const handleDelete = async (cue: GamePlanTimeoutCue) => {
    const ok = await appConfirm({
      title: "Remove counter",
      message: `Remove “${cue.title}” from this game plan?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    await onUpdateCues(removeTimeoutCue(plan.timeoutCues, cue.id));
    if (editingId === cue.id) cancelForm();
  };

  const setPriority = async (
    cue: GamePlanTimeoutCue,
    priority: GamePlanTimeoutCue["priority"],
  ) => {
    await onUpdateCues(patchTimeoutCue(plan.timeoutCues, cue.id, { priority }));
  };

  return (
    <section className="fc-game-plan-counters" aria-label="Timeout counters">
      <div className="fc-game-plan-counters-head">
        <div>
          <h3 className="fc-game-plan-counters-title">Timeout counters</h3>
          <p className="fc-game-plan-counters-sub">
            Curate defensive calls for Game Day / Timeout. Top 3 by priority show
            on the bench. Also from Film Room Analyze or Designer Coach.
          </p>
        </div>
        <div className="fc-game-plan-counters-head-actions">
          <span className="fc-game-plan-counters-count">
            {cues.length}/{TIMEOUT_CUES_MAX}
          </span>
          <button
            type="button"
            className="fc-game-plan-counters-btn"
            disabled={atCap}
            onClick={openManual}
          >
            Add manual
          </button>
          <button
            type="button"
            className="fc-game-plan-counters-btn primary"
            disabled={atCap || !libraryPlays.length}
            title={
              libraryPlays.length
                ? "Add from Counter Library"
                : "Tag defense plays in the Counters tab first"
            }
            onClick={openLibrary}
          >
            From library
          </button>
        </div>
      </div>

      {!cues.length && mode === "idle" ? (
        <p className="fc-game-plan-counters-empty">
          No timeout counters yet. Add from Counter Library, create manually, or
          apply selected counters from Film Room Analyze.
        </p>
      ) : null}

      {cues.length ? (
        <ul className="fc-game-plan-counters-list">
          {cues.map((cue) => {
            const defensePlay = cue.defensePlayId
              ? playsById.get(cue.defensePlayId)
              : undefined;
            const isEditing = editingId === cue.id;
            return (
              <li key={cue.id} className="fc-game-plan-counters-row">
                {isEditing ? (
                  <CueFormFields
                    form={form}
                    setForm={setForm}
                    onSave={() => void saveEdit(cue.id)}
                    onCancel={cancelForm}
                    saveLabel="Save changes"
                  />
                ) : (
                  <>
                    <div className="fc-game-plan-counters-row-main">
                      <div className="fc-game-plan-counters-badges">
                        <span className="fc-game-plan-counters-coverage">
                          {timeoutCueCoverageLabel(cue.coverage)}
                        </span>
                        {cue.targetsPattern ? (
                          <span className="fc-game-plan-counters-pattern">
                            vs {cue.targetsPattern}
                          </span>
                        ) : null}
                        <label className="fc-game-plan-counters-priority-label">
                          Priority
                          <select
                            className="fc-game-plan-counters-priority"
                            value={cue.priority ?? "medium"}
                            onChange={(e) =>
                              void setPriority(
                                cue,
                                e.target.value as GamePlanTimeoutCue["priority"],
                              )
                            }
                            aria-label={`Priority for ${cue.title}`}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </label>
                      </div>
                      <h4 className="fc-game-plan-counters-name">{cue.title}</h4>
                      <p className="fc-game-plan-counters-detail">{cue.detail}</p>
                      {cue.trigger ? (
                        <p className="fc-game-plan-counters-meta">
                          <strong>Trigger</strong> {cue.trigger}
                        </p>
                      ) : null}
                      {cue.ballHandlerRule || cue.screenerRule ? (
                        <div className="fc-game-plan-counters-rules">
                          {cue.ballHandlerRule ? (
                            <span>
                              <strong>BH</strong> {cue.ballHandlerRule}
                            </span>
                          ) : null}
                          {cue.screenerRule ? (
                            <span>
                              <strong>Big</strong> {cue.screenerRule}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {cue.weakPoint ? (
                        <p className="fc-game-plan-counters-meta">
                          <strong>Weak</strong> {cue.weakPoint}
                        </p>
                      ) : null}
                    </div>
                    <div className="fc-game-plan-counters-row-actions">
                      {cue.sourceFilmSessionId ? (
                        <Link
                          className="fc-game-plan-counters-link"
                          href={buildFilmRoomDeepLink(
                            cue.sourceFilmSessionId,
                            cue.sourceFilmTimestamp,
                          )}
                        >
                          Film ↗
                        </Link>
                      ) : null}
                      {defensePlay ? (
                        <Link
                          className="fc-game-plan-counters-link"
                          href={buildDesignerHref(defensePlay.id)}
                        >
                          Diagram ↗
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="fc-game-plan-counters-btn"
                        onClick={() => openEdit(cue)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="fc-game-plan-counters-btn danger"
                        onClick={() => void handleDelete(cue)}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {mode === "manual" ? (
        <div className="fc-game-plan-counters-form-wrap">
          <h4 className="fc-game-plan-counters-form-title">Add counter</h4>
          <CueFormFields
            form={form}
            setForm={setForm}
            onSave={() => void saveManual()}
            onCancel={cancelForm}
            saveLabel="Add counter"
          />
        </div>
      ) : null}

      {mode === "library" ? (
        <div className="fc-game-plan-counters-form-wrap">
          <h4 className="fc-game-plan-counters-form-title">
            Add from Counter Library
          </h4>
          {!libraryPlays.length ? (
            <p className="fc-game-plan-counters-empty">
              No Counter Library plays yet. Open the Counters tab → Create a
              defense play (Counter Library is on by default).
            </p>
          ) : (
            <>
              <label className="fc-game-plan-counters-field">
                <span>Play</span>
                <select
                  value={libraryPlayId}
                  onChange={(e) => setLibraryPlayId(e.target.value)}
                >
                  {libraryPlays.map((play) => {
                    const coverages = (play.defenseCounter?.coverages ?? [])
                      .map(
                        (id) =>
                          COUNTER_COVERAGE_LABELS[
                            id as keyof typeof COUNTER_COVERAGE_LABELS
                          ] ?? id,
                      )
                      .join(", ");
                    return (
                      <option key={play.id} value={play.id}>
                        {play.title}
                        {coverages ? ` · ${coverages}` : ""}
                      </option>
                    );
                  })}
                </select>
              </label>
              {onAddDefensePlay ? (
                <label className="fc-game-plan-counters-check">
                  <input
                    type="checkbox"
                    checked={alsoAddToDefense}
                    onChange={(e) => setAlsoAddToDefense(e.target.checked)}
                  />
                  <span>Also add play to Defense category</span>
                </label>
              ) : null}
              <div className="fc-game-plan-counters-form-actions">
                <button
                  type="button"
                  className="fc-game-plan-counters-btn"
                  onClick={cancelForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="fc-game-plan-counters-btn primary"
                  onClick={() => void saveLibrary()}
                >
                  Add counter
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CueFormFields({
  form,
  setForm,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: CueFormState;
  setForm: (next: CueFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const set =
    (key: keyof CueFormState) =>
    (
      e: ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <div className="fc-game-plan-counters-form">
      <label className="fc-game-plan-counters-field">
        <span>Title</span>
        <input
          type="text"
          value={form.title}
          onChange={set("title")}
          placeholder="ICE side PNR"
          autoComplete="off"
        />
      </label>
      <label className="fc-game-plan-counters-field fc-game-plan-counters-field-wide">
        <span>Detail</span>
        <textarea
          value={form.detail}
          onChange={set("detail")}
          rows={2}
          placeholder="Force baseline — deny middle reject…"
        />
      </label>
      <label className="fc-game-plan-counters-field">
        <span>Coverage</span>
        <select value={form.coverage} onChange={set("coverage")}>
          {COUNTER_LIBRARY_COVERAGE_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {COUNTER_COVERAGE_LABELS[id]}
            </option>
          ))}
          <option value="other">{COUNTER_COVERAGE_LABELS.other}</option>
        </select>
      </label>
      <label className="fc-game-plan-counters-field">
        <span>Vs pattern</span>
        <select value={form.targetsPattern} onChange={set("targetsPattern")}>
          <option value="">—</option>
          {COUNTER_LIBRARY_VS_PATTERNS.map((pattern) => (
            <option key={pattern} value={pattern}>
              {pattern}
            </option>
          ))}
        </select>
      </label>
      <label className="fc-game-plan-counters-field">
        <span>Priority</span>
        <select value={form.priority} onChange={set("priority")}>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </label>
      <label className="fc-game-plan-counters-field fc-game-plan-counters-field-wide">
        <span>Trigger</span>
        <input
          type="text"
          value={form.trigger}
          onChange={set("trigger")}
          placeholder="Ball screen on the wing / slot"
          autoComplete="off"
        />
      </label>
      <label className="fc-game-plan-counters-field fc-game-plan-counters-field-wide">
        <span>BH rule</span>
        <input
          type="text"
          value={form.ballHandlerRule}
          onChange={set("ballHandlerRule")}
          placeholder="Top foot over — no middle"
          autoComplete="off"
        />
      </label>
      <label className="fc-game-plan-counters-field fc-game-plan-counters-field-wide">
        <span>Big rule</span>
        <input
          type="text"
          value={form.screenerRule}
          onChange={set("screenerRule")}
          placeholder="Drop to nail; tag late"
          autoComplete="off"
        />
      </label>
      <label className="fc-game-plan-counters-field fc-game-plan-counters-field-wide">
        <span>Weak point</span>
        <input
          type="text"
          value={form.weakPoint}
          onChange={set("weakPoint")}
          placeholder="Middle reject when ICE is late"
          autoComplete="off"
        />
      </label>
      <div className="fc-game-plan-counters-form-actions">
        <button type="button" className="fc-game-plan-counters-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="fc-game-plan-counters-btn primary"
          onClick={onSave}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
