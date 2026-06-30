"use client";

import { getPlaybookBadgeLabel } from "@/lib/library/playbook-print";
import type { StoredPlay } from "@/types/library";

interface Props {
  plays: StoredPlay[];
  selectedPlayId: string | null;
  onSelectPlay: (playId: string) => void;
  onRemovePlay: (playId: string) => void;
}

export function PlaybookPlaysList({
  plays,
  selectedPlayId,
  onSelectPlay,
  onRemovePlay,
}: Props) {
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
          return (
            <div
              key={play.id}
              className={`fc-playbooks-play-row-wrap${selected ? " is-selected" : ""}`}
            >
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
