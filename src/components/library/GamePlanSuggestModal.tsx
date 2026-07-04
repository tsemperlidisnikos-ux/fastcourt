"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  enrichSuggestionsWithPlayDna,
  gamePlanSuggestModalTitle,
  suggestPlaysForGamePlanCategory,
} from "@/lib/game-plan/suggest-plays";
import type { GamePlanCategoryId } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

interface Props {
  open: boolean;
  categoryId: GamePlanCategoryId;
  plays: StoredPlay[];
  anchorPlays?: StoredPlay[];
  excludedPlayIds: ReadonlySet<string>;
  onClose: () => void;
  onAdd: (playIds: string[]) => void;
}

export function GamePlanSuggestModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <GamePlanSuggestModalBody {...props} />;
}

function GamePlanSuggestModalBody({
  categoryId,
  plays,
  anchorPlays = [],
  excludedPlayIds,
  onClose,
  onAdd,
}: Props) {
  const suggestions = useMemo(() => {
    const tagMatches = suggestPlaysForGamePlanCategory(
      plays,
      categoryId,
      excludedPlayIds,
    );
    if (!anchorPlays.length) return tagMatches;
    return enrichSuggestionsWithPlayDna(
      tagMatches,
      anchorPlays,
      plays,
      excludedPlayIds,
    );
  }, [anchorPlays, categoryId, excludedPlayIds, plays]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    if (!selectedIds.size) return;
    onAdd([...selectedIds]);
    onClose();
  }

  return createPortal(
    <div className="fc-game-plan-suggest-overlay" role="dialog" aria-modal="true">
      <div className="fc-game-plan-suggest-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-game-plan-suggest-panel">
        <header className="fc-game-plan-suggest-header">
          <h2>{gamePlanSuggestModalTitle(categoryId)}</h2>
          <p>
            Matched from tags, titles
            {anchorPlays.length ? " and Play DNA vs plays already in this category" : ""}.
          </p>
        </header>
        <div className="fc-game-plan-suggest-body">
          {!suggestions.length ? (
            <p className="fc-game-plan-suggest-empty">
              No matching plays found. Try adding tags like &quot;zone&quot;, &quot;ato&quot;, or
              &quot;press&quot; to your library plays.
            </p>
          ) : (
            <ul className="fc-game-plan-suggest-list">
              {suggestions.map(({ play, score, reasons }) => {
                const checked = selectedIds.has(play.id);
                return (
                  <li key={play.id}>
                    <label className={`fc-game-plan-suggest-row${checked ? " selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(play.id)}
                      />
                      <span className="fc-game-plan-suggest-row-main">
                        <span className="fc-game-plan-suggest-title">{play.title}</span>
                        <span className="fc-game-plan-suggest-meta">
                          {play.team || "No Team"}
                          {play.series ? ` · ${play.series}` : ""}
                          {play.tags?.length ? ` · ${play.tags.slice(0, 3).join(", ")}` : ""}
                        </span>
                        <span className="fc-game-plan-suggest-reasons">
                          {reasons.join(" · ")} · score {score}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <footer className="fc-game-plan-suggest-footer">
          <button type="button" className="fc-game-plan-suggest-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="fc-game-plan-suggest-btn primary"
            disabled={!selectedIds.size}
            onClick={handleAdd}
          >
            Add selected ({selectedIds.size})
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
