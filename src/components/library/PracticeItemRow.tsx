"use client";

import Link from "next/link";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import {
  isPracticeItemMissing,
  type ResolvedPracticeRow,
} from "@/lib/practice/practice-items";
import { isReadTrackableItem } from "@/lib/practice/read-success-scorecard";
import type { PracticeSessionItem } from "@/types/library-meta";

interface Props {
  row: ResolvedPracticeRow;
  totalRows: number;
  dragIndex: number | null;
  dropTargetIndex: number | null;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  onUpdate: (patch: Partial<PracticeSessionItem>) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onReplace?: () => void;
}

export function PracticeItemRow({
  row,
  totalRows,
  dragIndex,
  dropTargetIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onUpdate,
  onMove,
  onRemove,
  onReplace,
}: Props) {
  const { item, play, index } = row;
  const isCueOnly = !play && !!item.cueLabel;
  const isMissing = isPracticeItemMissing(row);
  const kind = play ? (play.type === "drill" ? "drill" : "play") : "cue";
  const kindLabel = kind === "drill" ? "Drill" : kind === "cue" ? "Block" : "Play";
  const name = play?.title || item.cueLabel || "(Missing from library)";
  const readTrackable = isReadTrackableItem(item);

  return (
    <div
      className={`practice-item-row${isMissing ? " practice-item-missing" : ""}${dragIndex === index ? " is-dragging" : ""}${dropTargetIndex === index && dragIndex !== index ? " is-drag-over" : ""}`}
      draggable
      onDragStart={(e) => {
        if (!(e.target as HTMLElement).closest(".practice-item-drag")) {
          e.preventDefault();
          return;
        }
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="practice-item-drag" title="Drag to reorder" aria-hidden="true">
        ⠿
      </div>
      <div className="practice-item-order">{index + 1}</div>
      <div className="practice-item-thumb">
        {play?.frames?.[0] ? (
          <CourtFrameThumbnail
            frame={play.frames[0]}
            courtType={play.courtType}
            size="sm"
          />
        ) : (
          <span>{isMissing ? "⚠" : isCueOnly ? "📋" : "🏀"}</span>
        )}
      </div>
      <div className="practice-item-main">
        <div className="practice-item-name">{name}</div>
        <div className="practice-item-meta">
          <span className={`practice-item-type practice-item-type-${kind === "cue" ? "play" : kind}`}>
            {kindLabel}
          </span>
          {isMissing ? (
            <span className="practice-item-missing-label">Missing from library</span>
          ) : null}
          {play?.series ? <span>{play.series}</span> : null}
          {readTrackable && item.readOutcome === "landed" ? (
            <span className="practice-item-read-outcome is-landed">Landed</span>
          ) : null}
          {readTrackable && item.readOutcome === "missed" ? (
            <span className="practice-item-read-outcome is-missed">Missed</span>
          ) : null}
          {readTrackable && !item.readOutcome ? (
            <span className="practice-item-read-outcome is-pending">Read</span>
          ) : null}
        </div>
        {isMissing && onReplace ? (
          <button
            type="button"
            className="practice-item-replace-btn"
            onClick={onReplace}
          >
            Replace play
          </button>
        ) : null}
        <input
          type="text"
          className="practice-item-notes"
          placeholder="Coaching cue for this block…"
          value={item.notes || ""}
          onChange={(e) => onUpdate({ notes: e.target.value })}
        />
        <div className="practice-item-media">
          <label className="practice-item-media-field">
            <span>Video URL</span>
            <input
              type="url"
              className="practice-item-video"
              placeholder="YouTube / Vimeo URL"
              value={item.videoUrl || ""}
              onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            />
          </label>
          {play ? (
            <Link
              href={`/designer?item=${play.id}`}
              className="practice-item-open-link"
            >
              Open
            </Link>
          ) : null}
        </div>
      </div>
      <label className="practice-item-duration">
        <span>Min</span>
        <input
          type="number"
          min={1}
          value={item.durationMin}
          onChange={(e) =>
            onUpdate({ durationMin: Math.max(1, Number(e.target.value) || 1) })
          }
        />
      </label>
      <div className="practice-item-move">
        <button
          type="button"
          className="practice-item-move-btn"
          title="Move up"
          disabled={index === 0}
          onClick={() => onMove("up")}
        >
          ↑
        </button>
        <button
          type="button"
          className="practice-item-move-btn"
          title="Move down"
          disabled={index >= totalRows - 1}
          onClick={() => onMove("down")}
        >
          ↓
        </button>
      </div>
      <button
        type="button"
        className="practice-item-remove"
        title="Remove"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  );
}
