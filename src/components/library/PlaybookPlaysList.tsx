"use client";

import { useState } from "react";
import { getPlaybookBadgeLabel } from "@/lib/library/playbook-print";
import type { StoredPlay } from "@/types/library";

interface Props {
  plays: StoredPlay[];
  selectedPlayId: string | null;
  onSelectPlay: (playId: string) => void;
  onRemovePlay: (playId: string) => void;
  onReorderPlays: (fromIndex: number, toIndex: number) => void;
}

export function PlaybookPlaysList({
  plays,
  selectedPlayId,
  onSelectPlay,
  onRemovePlay,
  onReorderPlays,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <aside
      className="fc-playbooks-plays-pane"
      id="fc-playbooks-plays-pane"
      aria-label="Plays in playbook"
    >
      <div className="fc-playbooks-plays-list" id="fc-playbooks-plays-list">
        {plays.map((play, index) => {
          const selected = selectedPlayId === play.id;
          const title = play.title?.trim() || "Untitled";
          const kind = getPlaybookBadgeLabel(play);
          const isDragging = dragIndex === index;
          const isDropTarget =
            dropIndex === index && dragIndex !== null && dragIndex !== index;

          return (
            <div
              key={play.id}
              className={`fc-playbooks-play-row-wrap${selected ? " is-selected" : ""}${
                isDragging ? " is-dragging" : ""
              }${isDropTarget ? " is-drop-target" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                if (dragIndex !== null && dragIndex !== index) {
                  setDropIndex(index);
                }
              }}
              onDragLeave={() => {
                if (dropIndex === index) setDropIndex(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const from = dragIndex;
                setDragIndex(null);
                setDropIndex(null);
                if (from == null || from === index) return;
                onReorderPlays(from, index);
              }}
            >
              <button
                type="button"
                className="fc-playbooks-play-row-drag"
                draggable
                aria-label={`Reorder ${title}`}
                title="Drag to reorder"
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", play.id);
                  setDragIndex(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
              >
                ⠿
              </button>
              <button
                type="button"
                className={`fc-playbooks-play-row${selected ? " selected" : ""}`}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelectPlay(play.id)}
              >
                <span className="fc-playbooks-play-row-index">{index + 1}.</span>
                <span className="fc-playbooks-play-row-body">
                  <span className="fc-playbooks-play-title">{title}</span>
                  {kind ? (
                    <span className="fc-playbooks-play-kind">{kind}</span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                className="fc-playbooks-play-row-remove"
                aria-label={`Remove ${title} from playbook`}
                title="Remove from playbook"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlay(play.id);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
