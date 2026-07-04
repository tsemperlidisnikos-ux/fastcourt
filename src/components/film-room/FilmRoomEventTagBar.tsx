"use client";

import { useMemo, useState } from "react";
import {
  FILM_ANALYZE_EVENT_RADIUS_SEC,
  FILM_EVENT_KEYBOARD_MAP,
  FILM_ROOM_EVENT_KINDS,
  FILM_ROOM_EVENT_LABELS,
  formatFilmEventTime,
  selectFilmEventsForAnalyze,
} from "@/lib/film-room/film-event-tags";
import type { FilmRoomEvent, FilmRoomEventKind } from "@/types/film-room";

interface Props {
  currentTime: number;
  events: FilmRoomEvent[];
  noteDraft: string;
  disabled?: boolean;
  canUndo?: boolean;
  onNoteChange: (value: string) => void;
  onTag: (kind: FilmRoomEventKind, note?: string) => void;
  onUndoLast: () => void;
  onUpdate: (
    eventId: string,
    patch: { kind?: FilmRoomEventKind; note?: string },
  ) => void;
  onRemove: (eventId: string) => void;
  onSeek: (time: number) => void;
}

export function FilmRoomEventTagBar({
  currentTime,
  events,
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
  const [editKind, setEditKind] = useState<FilmRoomEventKind>("pnr");
  const [editNote, setEditNote] = useState("");

  const sorted = [...events].sort((a, b) => a.time - b.time);

  const activeTagIds = useMemo(() => {
    const active = selectFilmEventsForAnalyze(events, currentTime, {
      radiusSec: FILM_ANALYZE_EVENT_RADIUS_SEC,
    });
    return new Set(active.map((row) => row.id));
  }, [currentTime, events]);

  function handleTag(kind: FilmRoomEventKind) {
    const note = noteDraft.trim();
    onTag(kind, note || undefined);
    if (note) onNoteChange("");
  }

  function startEdit(event: FilmRoomEvent) {
    setEditingId(event.id);
    setEditKind(event.kind);
    setEditNote(event.note ?? "");
  }

  function saveEdit(eventId: string) {
    onUpdate(eventId, {
      kind: editKind,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  }

  const keyboardHint = Object.keys(FILM_EVENT_KEYBOARD_MAP).length;

  return (
    <div className="fc-film-event-bar" aria-label="Coach event tags">
      <div className="fc-film-event-bar-tags">
        <span className="fc-film-event-bar-label">Tag at {formatFilmEventTime(currentTime)}</span>
        {FILM_ROOM_EVENT_KINDS.map((kind) => {
          const keyIndex = Object.entries(FILM_EVENT_KEYBOARD_MAP).find(
            ([, value]) => value === kind,
          )?.[0];
          return (
            <button
              key={kind}
              type="button"
              className="fc-film-event-tag-btn"
              disabled={disabled}
              title={
                keyIndex
                  ? `Tag ${FILM_ROOM_EVENT_LABELS[kind]} (${keyIndex})`
                  : `Tag ${FILM_ROOM_EVENT_LABELS[kind]}`
              }
              onClick={() => handleTag(kind)}
            >
              {keyIndex ? <span className="fc-film-event-tag-key">{keyIndex}</span> : null}
              {FILM_ROOM_EVENT_LABELS[kind]}
            </button>
          );
        })}
        <input
          type="text"
          className="fc-film-event-note-input"
          value={noteDraft}
          disabled={disabled}
          placeholder="Optional note"
          maxLength={120}
          onChange={(e) => onNoteChange(e.target.value)}
        />
        <button
          type="button"
          className="fc-film-event-undo-btn"
          disabled={disabled || !canUndo}
          onClick={onUndoLast}
          title="Undo last tag"
        >
          Undo tag
        </button>
      </div>
      {sorted.length > 0 ? (
        <ul className="fc-film-event-list">
          {sorted.map((event) => {
            const inAnalyzeWindow = activeTagIds.has(event.id);
            const editing = editingId === event.id;
            return (
              <li
                key={event.id}
                className={`fc-film-event-row${inAnalyzeWindow ? " is-analyze-window" : ""}${editing ? " is-editing" : ""}`}
              >
                {editing ? (
                  <div className="fc-film-event-edit">
                    <select
                      value={editKind}
                      onChange={(e) => setEditKind(e.target.value as FilmRoomEventKind)}
                    >
                      {FILM_ROOM_EVENT_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {FILM_ROOM_EVENT_LABELS[kind]}
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
                    <button type="button" onClick={() => saveEdit(event.id)}>
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
                      className="fc-film-event-seek"
                      onClick={() => onSeek(event.time)}
                      title={
                        inAnalyzeWindow
                          ? "In analyze window — jump to tag"
                          : "Jump to this tag"
                      }
                    >
                      <span className="fc-film-event-time">
                        {formatFilmEventTime(event.time)}
                      </span>
                      <span className={`fc-film-event-kind is-${event.kind}`}>
                        {FILM_ROOM_EVENT_LABELS[event.kind]}
                      </span>
                      {event.note ? (
                        <span className="fc-film-event-note">{event.note}</span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      className="fc-film-event-edit-btn"
                      aria-label={`Edit ${FILM_ROOM_EVENT_LABELS[event.kind]} tag`}
                      onClick={() => startEdit(event)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="fc-film-event-remove"
                      aria-label={`Remove ${FILM_ROOM_EVENT_LABELS[event.kind]} tag`}
                      onClick={() => onRemove(event.id)}
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
        <p className="fc-film-event-empty">
          Tag actions with keys 1–{keyboardHint} — Analyze sends 10 frames + nearby tags to AI.
        </p>
      )}
    </div>
  );
}
