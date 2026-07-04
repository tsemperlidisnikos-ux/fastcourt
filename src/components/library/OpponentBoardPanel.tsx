"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createOpponentTendency,
  OPPONENT_TENDENCY_PRESETS,
  opponentTendencyKindLabel,
  suggestDefenseForTendency,
} from "@/lib/game-plan/opponent-board";
import {
  buildFilmRoomDeepLink,
  formatFilmTimestamp,
} from "@/lib/film-room/film-game-plan-link";
import { useFilmRoomStore } from "@/stores/film-room-store";
import type { GamePlan, OpponentTendencyKind } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import { appPrompt } from "@/stores/dialog-store";

interface Props {
  plan: GamePlan;
  plays: StoredPlay[];
  excludedPlayIds: ReadonlySet<string>;
  onUpdateBoard: (tendencies: GamePlan["opponentBoard"]) => void;
  onAddPlayToDefense: (playId: string) => void;
  onAddPlaysToDefense: (playIds: string[]) => void;
}

export function OpponentBoardPanel({
  plan,
  plays,
  excludedPlayIds,
  onUpdateBoard,
  onAddPlayToDefense,
  onAddPlaysToDefense,
}: Props) {
  const router = useRouter();
  const filmSessions = useFilmRoomStore((s) => s.sessions);
  const filmHydrated = useFilmRoomStore((s) => s.hydrated);
  const loadFilmSessions = useFilmRoomStore((s) => s.load);

  const tendencies = plan.opponentBoard ?? [];
  const [activeId, setActiveId] = useState<string | null>(
    tendencies[0]?.id ?? null,
  );

  const hasFilmLinks = tendencies.some((row) => row.filmSessionId);

  useEffect(() => {
    if (!hasFilmLinks || filmHydrated) return;
    void loadFilmSessions();
  }, [filmHydrated, hasFilmLinks, loadFilmSessions]);

  const filmSessionTitles = useMemo(
    () => new Map(filmSessions.map((session) => [session.id, session.title])),
    [filmSessions],
  );

  const activeTendency =
    tendencies.find((row) => row.id === activeId) ?? tendencies[0] ?? null;

  const suggestions = useMemo(() => {
    if (!activeTendency) return [];
    return suggestDefenseForTendency(
      plays,
      activeTendency,
      excludedPlayIds,
      6,
    );
  }, [activeTendency, excludedPlayIds, plays]);

  async function handleAddPreset(kind: OpponentTendencyKind) {
    let label = opponentTendencyKindLabel(kind);
    if (kind === "other") {
      const custom = await appPrompt({
        title: "Opponent tendency",
        label: "What do they run?",
        initialValue: "",
        submitLabel: "Add",
      });
      if (!custom?.trim()) return;
      label = custom.trim();
    }

    const notes = await appPrompt({
      title: "Scout note (optional)",
      label: "Notes from film or scouting",
      initialValue: "",
      submitLabel: "Save",
      allowEmpty: true,
    });

    const next = [
      ...tendencies,
      createOpponentTendency(kind, label, notes ?? undefined),
    ];
    onUpdateBoard(next);
    setActiveId(next[next.length - 1]?.id ?? null);
  }

  async function handleEditNotes(id: string) {
    const row = tendencies.find((item) => item.id === id);
    if (!row) return;
    const notes = await appPrompt({
      title: "Scout note",
      label: "Notes",
      initialValue: row.notes || "",
      submitLabel: "Save",
      allowEmpty: true,
    });
    if (notes == null) return;
    onUpdateBoard(
      tendencies.map((item) =>
        item.id === id ? { ...item, notes: notes.trim() || undefined } : item,
      ),
    );
  }

  function handleRemove(id: string) {
    const next = tendencies.filter((item) => item.id !== id);
    onUpdateBoard(next);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
  }

  return (
    <section className="fc-opponent-board" aria-label="Opponent board">
      <div className="fc-opponent-board-head">
        <div>
          <h3 className="fc-opponent-board-title">Opponent board</h3>
          <p className="fc-opponent-board-sub">
            Tag what {plan.opponent} runs — get defensive play suggestions from your library.
          </p>
        </div>
      </div>

      <div className="fc-opponent-board-presets" role="group" aria-label="Add tendency">
        {OPPONENT_TENDENCY_PRESETS.map((preset) => (
          <button
            key={preset.kind}
            type="button"
            className="fc-opponent-board-preset"
            onClick={() => void handleAddPreset(preset.kind)}
          >
            + {preset.label}
          </button>
        ))}
        <button
          type="button"
          className="fc-opponent-board-preset fc-opponent-board-preset-other"
          onClick={() => void handleAddPreset("other")}
        >
          + Other
        </button>
      </div>

      {!tendencies.length ? (
        <p className="fc-opponent-board-empty">
          Add tendencies from film or scouting (zone, press, BLOB, etc.).
        </p>
      ) : (
        <>
          <ul className="fc-opponent-board-list">
            {tendencies.map((row) => {
              const active = row.id === activeTendency?.id;
              const filmTitle = row.filmSessionId
                ? filmSessionTitles.get(row.filmSessionId)
                : undefined;
              const filmTime = formatFilmTimestamp(row.filmTimestamp);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className={`fc-opponent-board-chip${active ? " active" : ""}`}
                    onClick={() => setActiveId(row.id)}
                  >
                    <span className="fc-opponent-board-chip-label">{row.label}</span>
                    {row.filmSessionId ? (
                      <span className="fc-opponent-board-chip-film">
                        Film
                        {filmTitle ? `: ${filmTitle}` : ""}
                        {filmTime ? ` @ ${filmTime}` : ""}
                      </span>
                    ) : null}
                    {row.notes ? (
                      <span className="fc-opponent-board-chip-note">{row.notes}</span>
                    ) : null}
                  </button>
                  <div className="fc-opponent-board-chip-actions">
                    {row.filmSessionId ? (
                      <button
                        type="button"
                        className="fc-opponent-board-chip-btn fc-opponent-board-film-btn"
                        title="Open film clip"
                        onClick={() =>
                          router.push(
                            buildFilmRoomDeepLink(row.filmSessionId!, row.filmTimestamp),
                          )
                        }
                      >
                        Clip
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="fc-opponent-board-chip-btn"
                      title="Edit notes"
                      onClick={() => void handleEditNotes(row.id)}
                    >
                      Note
                    </button>
                    <button
                      type="button"
                      className="fc-opponent-board-chip-btn danger"
                      title="Remove"
                      onClick={() => handleRemove(row.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {activeTendency ? (
            <div className="fc-opponent-board-suggestions">
              <div className="fc-opponent-board-suggestions-head">
                <h4 className="fc-opponent-board-suggestions-title">
                  Suggested defense vs {activeTendency.label}
                </h4>
                <button
                  type="button"
                  className="fc-opponent-board-suggest-all"
                  onClick={() =>
                    onAddPlaysToDefense(suggestions.map((row) => row.play.id))
                  }
                >
                  Add all ({suggestions.length})
                </button>
              </div>
              {!suggestions.length ? (
                <p className="fc-opponent-board-suggest-empty">
                  No matches yet. Tag library plays with &quot;defense&quot;, &quot;zone&quot;, or
                  &quot;press&quot;.
                </p>
              ) : (
                <ul className="fc-opponent-board-suggest-list">
                  {suggestions.map(({ play, score, reasons }) => (
                    <li key={play.id} className="fc-opponent-board-suggest-row">
                      <div className="fc-opponent-board-suggest-main">
                        <span className="fc-opponent-board-suggest-title">{play.title}</span>
                        <span className="fc-opponent-board-suggest-meta">
                          {Math.round(score)} pts · {reasons.slice(0, 2).join(", ")}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="fc-opponent-board-suggest-add"
                        onClick={() => onAddPlayToDefense(play.id)}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
