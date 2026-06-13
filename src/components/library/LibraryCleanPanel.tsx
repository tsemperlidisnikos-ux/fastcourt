"use client";

import {
  matchesLibraryCleanFilter,
  summarizeLibraryClean,
  type LibraryCleanFilter,
} from "@/lib/library/library-clean";
import { getLibraryReviewQueue } from "@/lib/library/library-review";
import type { LibraryItem } from "@/types/library";

interface Props {
  open: boolean;
  filter: LibraryCleanFilter;
  items: LibraryItem[];
  assignedPlayIds: Set<string>;
  previewId: string | null;
  onFilterChange: (filter: LibraryCleanFilter) => void;
  onOpenFirst: () => void;
  onSelectMatches: () => void;
  onReviewNext: () => void;
  onMarkReviewed: () => void;
  onReviewDuplicates: () => void;
  onAutoCategorize: () => void;
  onResetReviewed: () => void;
  onClose: () => void;
}

const FILTERS: Array<{ id: LibraryCleanFilter; label: string }> = [
  { id: "duplicates", label: "Duplicates" },
  { id: "no-team", label: "No Team" },
  { id: "empty", label: "Empty" },
  { id: "lazy", label: "Lazy" },
  { id: "unassigned", label: "No Playbook" },
  { id: "misc", label: "Miscellaneous" },
  { id: "status-redraw", label: "Needs redraw" },
  { id: "status-category", label: "Needs category" },
  { id: "status-ok", label: "OK reviewed" },
];

export function LibraryCleanToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      id="btn-library-clean"
      className={`fd-menu-btn library-clean-toggle${open ? " active" : ""}`}
      onClick={onToggle}
      title="Clean library"
    >
      Clean
    </button>
  );
}

export function LibraryCleanPanel({
  open,
  filter,
  items,
  assignedPlayIds,
  previewId,
  onFilterChange,
  onOpenFirst,
  onSelectMatches,
  onReviewNext,
  onMarkReviewed,
  onReviewDuplicates,
  onAutoCategorize,
  onResetReviewed,
  onClose,
}: Props) {
  if (!open) return null;

  const summary = summarizeLibraryClean(items, assignedPlayIds);
  const queue = getLibraryReviewQueue(items.map((i) => i.id));

  const countFor = (id: LibraryCleanFilter) => {
    if (id === "duplicates") return summary.duplicates;
    if (id === "no-team") return summary.noTeam;
    if (id === "empty") return summary.empty;
    if (id === "lazy") return summary.lazy;
    if (id === "unassigned") return summary.unassigned;
    if (id === "misc") return summary.misc;
    if (id === "status-redraw") return summary.statusRedraw;
    if (id === "status-category") return summary.statusCategory;
    if (id === "status-ok") return summary.statusOk;
    return 0;
  };

  const matchCount = items.filter((item) =>
    matchesLibraryCleanFilter(item, filter, items, assignedPlayIds),
  ).length;

  return (
    <div className="library-clean-panel" id="library-clean-panel">
      <div className="library-clean-main">
        <div className="library-clean-title">Clean library</div>
        <div className="library-clean-summary" id="library-clean-summary">
          {summary.total} plays · review {queue.reviewedCount}/{queue.all.length} ·{" "}
          {queue.pending.length} left · {summary.duplicateGroups} duplicate group(s) /{" "}
          {summary.duplicates} plays · {summary.noTeam} no team · {summary.empty} empty ·{" "}
          {summary.lazy} lazy · {summary.unassigned} no playbook · {summary.misc} misc
          {filter !== "off" ? ` · showing ${matchCount} match(es)` : ""}
        </div>
      </div>
      <div className="library-clean-actions">
        {FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`library-clean-chip${filter === chip.id ? " active" : ""}`}
            data-library-clean-filter={chip.id}
            disabled={countFor(chip.id) === 0}
            onClick={() => onFilterChange(filter === chip.id ? "off" : chip.id)}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-open-first"
          disabled={filter === "off" || matchCount === 0}
          onClick={onOpenFirst}
        >
          Open first
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-select-all"
          disabled={filter === "off" || matchCount === 0}
          onClick={onSelectMatches}
        >
          Select matches
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-review-duplicates"
          disabled={summary.duplicates === 0}
          onClick={onReviewDuplicates}
        >
          Review duplicates
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-auto-categorize"
          disabled={summary.misc === 0 && summary.noTeam === 0}
          onClick={onAutoCategorize}
        >
          Smart categorize
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-review-next"
          disabled={queue.pending.length === 0}
          onClick={onReviewNext}
        >
          Review next
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-mark-reviewed"
          disabled={!previewId}
          onClick={onMarkReviewed}
        >
          Mark reviewed
        </button>
        <button
          type="button"
          className="library-clean-btn-small"
          id="library-clean-reset-reviewed"
          disabled={queue.reviewedCount === 0}
          onClick={onResetReviewed}
        >
          Reset reviewed
        </button>
        <button
          type="button"
          className="library-clean-btn-small library-clean-clear"
          id="library-clean-clear"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
