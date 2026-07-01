"use client";

import { FilmRoomMarkupToolIcon } from "@/components/film-room/FilmRoomMarkupToolIcon";
import {
  FILM_ROOM_MARKUP_PRESETS,
  type FilmRoomMarkupPreset,
} from "@/lib/film-room/markup-toolbar-presets";

interface Props {
  activePreset: FilmRoomMarkupPreset;
  onPresetChange: (preset: FilmRoomMarkupPreset) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M9 8.5 5.5 12 9 15.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12h8.5a5.5 5.5 0 1 1 0 11H12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M15 8.5 18.5 12 15 15.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12H9.5a5.5 5.5 0 1 0 0 11H13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M9 4h6l1 2h4v2H4V6h4l1-2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M7 10v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 12v7M14 12v7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function FilmRoomToolbar({
  activePreset,
  onPresetChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  return (
    <div className="fc-film-markup-toolbar" aria-label="Film room markup tools">
      <div className="fc-film-markup-history" role="group" aria-label="Undo and redo">
        <button
          type="button"
          className="fc-film-markup-history-btn"
          title="Undo"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="fc-film-markup-history-btn"
          title="Redo"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <RedoIcon />
        </button>
      </div>

      <div className="fc-film-markup-tools" role="toolbar" aria-label="Drawing tools">
        {FILM_ROOM_MARKUP_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`fc-film-markup-tool${activePreset === preset.id ? " is-active" : ""}`}
            title={preset.title}
            aria-pressed={activePreset === preset.id}
            aria-label={preset.title}
            onClick={() => onPresetChange(preset.id)}
          >
            <FilmRoomMarkupToolIcon variant={preset.icon} accent={preset.color} />
          </button>
        ))}
      </div>

      <button
        type="button"
        className="fc-film-markup-clear"
        title="Clear all pencil drawings"
        onClick={onClear}
      >
        <TrashIcon />
        <span>Clear Drawing</span>
      </button>
    </div>
  );
}
