"use client";

import { useMemo, useState } from "react";
import {
  FILM_ANALYZE_DISRUPTION_RADIUS_SEC,
  FILM_DISRUPTION_KEYBOARD_MAP,
  FILM_ROOM_DISRUPTION_KINDS,
  FILM_ROOM_DISRUPTION_LABELS,
  formatDisruptionTime,
  selectFilmDisruptionsForAnalyze,
} from "@/lib/film-room/film-disruption-tags";
import type { FilmRoomDisruption, FilmRoomDisruptionKind } from "@/types/film-room";

interface Props {
  currentTime: number;
  disruptions: FilmRoomDisruption[];
  noteDraft: string;
  disabled?: boolean;
  canUndo?: boolean;
  onNoteChange: (value: string) => void;
  onTag: (kind: FilmRoomDisruptionKind, note?: string) => void;
  onUndoLast: () => void;
  onUpdate: (
    disruptionId: string,
    patch: { kind?: FilmRoomDisruptionKind; note?: string },
  ) => void;
  onRemove: (disruptionId: string) => void;
  onSeek: (time: number) => void;
}

export function FilmRoomDisruptionTagBar({
  currentTime,
  disruptions,
  noteDraft,
  disabled,
  canUndo,
  onNoteChange,
  onTag,
  onUndoLast,
  onUpdate,
  onRemove,
  onSeek,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<FilmRoomDisruptionKind>("hedge");
  const [editNote, setEditNote] = useState("");

  const sorted = [...disruptions].sort((a, b) => a.time - b.time);

  const activeIds = useMemo(() => {
    const active = selectFilmDisruptionsForAnalyze(disruptions, currentTime, {
      radiusSec: FILM_ANALYZE_DISRUPTION_RADIUS_SEC,
    });
    return new Set(active.map((row) => row.id));
  }, [currentTime, disruptions]);

  function handleTag(kind: FilmRoomDisruptionKind) {
    const note = noteDraft.trim();
    onTag(kind, note || undefined);
    if (note) onNoteChange("");
  }

  function startEdit(row: FilmRoomDisruption) {
    setEditingId(row.id);
    setEditKind(row.kind);
    setEditNote(row.note ?? "");
  }

  function saveEdit(disruptionId: string) {
    onUpdate(disruptionId, {
      kind: editKind,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  }

  return (
    <div className="fc-film-disruption-bar" aria-label="Defensive disruption tags">
      <div className="fc-film-disruption-bar-tags">
        <span className="fc-film-disruption-bar-label">
          Disruption at {formatDisruptionTime(currentTime)}
        </span>
        {FILM_ROOM_DISRUPTION_KINDS.map((kind) => {
          const key = Object.entries(FILM_DISRUPTION_KEYBOARD_MAP).find(
            ([, value]) => value === kind,
          )?.[0];
          return (
            <button
              key={kind}
              type="button"
              className="fc-film-disruption-tag-btn"
              disabled={disabled}
              title={
                key
                  ? `Tag ${FILM_ROOM_DISRUPTION_LABELS[kind]} (${key.toUpperCase()})`
                  : `Tag ${FILM_ROOM_DISRUPTION_LABELS[kind]}`
              }
              onClick={() => handleTag(kind)}
            >
              {key ? (
                <span className="fc-film-disruption-tag-key">{key.toUpperCase()}</span>
              ) : null}
              {FILM_ROOM_DISRUPTION_LABELS[kind]}
            </button>
          );
        })}
        <button
          type="button"
          className="fc-film-disruption-undo-btn"
          disabled={disabled || !canUndo}
          onClick={onUndoLast}
          title="Undo last disruption tag"
        >
          Undo
        </button>
      </div>
      {sorted.length > 0 ? (
        <ul className="fc-film-disruption-list">
          {sorted.map((row) => {
            const inWindow = activeIds.has(row.id);
            const editing = editingId === row.id;
            return (
              <li
                key={row.id}
                className={`fc-film-disruption-row${inWindow ? " is-analyze-window" : ""}${editing ? " is-editing" : ""}`}
              >
                {editing ? (
                  <div className="fc-film-disruption-edit">
                    <select
                      value={editKind}
                      onChange={(e) =>
                        setEditKind(e.target.value as FilmRoomDisruptionKind)
                      }
                    >
                      {FILM_ROOM_DISRUPTION_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {FILM_ROOM_DISRUPTION_LABELS[kind]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editNote}
                      placeholder="Note"
                      maxLength={120}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                    <button type="button" onClick={() => saveEdit(row.id)}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fc-film-disruption-seek"
                      onClick={() => onSeek(row.time)}
                    >
                      <span className="fc-film-disruption-time">
                        {formatDisruptionTime(row.time)}
                      </span>
                      <span className={`fc-film-disruption-kind is-${row.kind}`}>
                        {FILM_ROOM_DISRUPTION_LABELS[row.kind]}
                      </span>
                      {row.note ? (
                        <span className="fc-film-disruption-note">{row.note}</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="fc-film-disruption-edit-btn"
                      aria-label={`Edit ${FILM_ROOM_DISRUPTION_LABELS[row.kind]} tag`}
                      onClick={() => startEdit(row)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="fc-film-disruption-remove"
                      aria-label={`Remove ${FILM_ROOM_DISRUPTION_LABELS[row.kind]} tag`}
                      onClick={() => onRemove(row.id)}
                    >
                      ×
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="fc-film-disruption-empty">
          Tag when defense breaks the play — H hedge, W switch, I ICE, T trap…
        </p>
      )}
    </div>
  );
}
