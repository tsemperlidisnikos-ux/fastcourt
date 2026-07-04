"use client";

import { useMemo, useState } from "react";
import {
  defaultFilmBookmarkLabel,
  FILM_BOOKMARK_QUICK_LABELS,
  FILM_DISRUPTION_BOOKMARK_LABEL,
  formatFilmBookmarkSummary,
  sortFilmBookmarks,
} from "@/lib/film-room/film-room-bookmarks";
import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import type { FilmRoomBookmark, FilmRoomBookmarkKind } from "@/types/film-room";

interface Props {
  currentTime: number;
  bookmarks: FilmRoomBookmark[];
  disabled?: boolean;
  onAdd: (label: string, note?: string, kind?: FilmRoomBookmarkKind) => void;
  onUpdate: (
    bookmarkId: string,
    patch: { label?: string; note?: string },
  ) => void;
  onRemove: (bookmarkId: string) => void;
  onSeek: (time: number) => void;
}

export function FilmRoomBookmarkBar({
  currentTime,
  bookmarks,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
  onSeek,
}: Props) {
  const [labelDraft, setLabelDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editNote, setEditNote] = useState("");

  const sorted = useMemo(() => sortFilmBookmarks(bookmarks), [bookmarks]);
  const timeLabel = formatFilmEventTime(currentTime);

  function handleAdd(labelOverride?: string, kind: FilmRoomBookmarkKind = "chapter") {
    const label = (labelOverride ?? labelDraft).trim();
    onAdd(
      label || defaultFilmBookmarkLabel(currentTime),
      noteDraft.trim() || undefined,
      kind,
    );
    setLabelDraft("");
    setNoteDraft("");
  }

  function startEdit(bookmark: FilmRoomBookmark) {
    setEditingId(bookmark.id);
    setEditLabel(bookmark.label);
    setEditNote(bookmark.note ?? "");
  }

  function saveEdit(bookmarkId: string) {
    const label = editLabel.trim();
    if (!label) return;
    onUpdate(bookmarkId, {
      label,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  }

  return (
    <div className="fc-film-bookmark-bar" aria-label="Clip chapters">
      <div className="fc-film-bookmark-bar-head">
        <span className="fc-film-bookmark-bar-label">
          Chapter at {timeLabel}
        </span>
        <div className="fc-film-bookmark-bar-quick">
          {FILM_BOOKMARK_QUICK_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className="fc-film-bookmark-quick-btn"
              disabled={disabled}
              onClick={() => handleAdd(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="fc-film-bookmark-bar-form">
        <input
          type="text"
          className="fc-film-bookmark-input"
          placeholder={`e.g. Q2 ${timeLabel} Horns`}
          aria-label="Chapter label"
          value={labelDraft}
          disabled={disabled}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <input
          type="text"
          className="fc-film-bookmark-note-input"
          placeholder="Note (optional)"
          aria-label="Chapter note"
          value={noteDraft}
          disabled={disabled}
          onChange={(e) => setNoteDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          className="fc-film-bookmark-add-btn fc-film-bookmark-disruption-btn"
          disabled={disabled}
          title="Mark where the play broke (Shift+B)"
          onClick={() => handleAdd(FILM_DISRUPTION_BOOKMARK_LABEL, "disruption")}
        >
          Plan broke here
        </button>
        <button
          type="button"
          className="fc-film-bookmark-add-btn"
          disabled={disabled}
          title="Add chapter bookmark (B)"
          onClick={() => handleAdd()}
        >
          Add chapter
        </button>
      </div>

      {sorted.length ? (
        <ul className="fc-film-bookmark-list">
          {sorted.map((bookmark) => {
            const editing = editingId === bookmark.id;
            return (
              <li
                key={bookmark.id}
                className={`fc-film-bookmark-row${bookmark.kind === "disruption" ? " is-disruption" : ""}`}
              >
                {editing ? (
                  <div className="fc-film-bookmark-edit">
                    <input
                      type="text"
                      className="fc-film-bookmark-input"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      aria-label="Edit chapter label"
                    />
                    <input
                      type="text"
                      className="fc-film-bookmark-note-input"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      aria-label="Edit chapter note"
                    />
                    <button
                      type="button"
                      className="fc-film-bookmark-save-btn"
                      onClick={() => saveEdit(bookmark.id)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="fc-film-bookmark-cancel-btn"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="fc-film-bookmark-open"
                      onClick={() => onSeek(bookmark.time)}
                      title={formatFilmBookmarkSummary(bookmark)}
                    >
                      <span className="fc-film-bookmark-time">
                        {formatFilmEventTime(bookmark.time)}
                      </span>
                      <span className="fc-film-bookmark-title">{bookmark.label}</span>
                      {bookmark.note ? (
                        <span className="fc-film-bookmark-note">{bookmark.note}</span>
                      ) : null}
                    </button>
                    <div className="fc-film-bookmark-actions">
                      <button
                        type="button"
                        className="fc-film-bookmark-action-btn"
                        onClick={() => startEdit(bookmark)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="fc-film-bookmark-action-btn danger"
                        onClick={() => onRemove(bookmark.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="fc-film-bookmark-empty">
          Mark possessions or sets — jump back quickly from the list or timeline.
        </p>
      )}
    </div>
  );
}
