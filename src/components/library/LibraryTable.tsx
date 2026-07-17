"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { FC_CONTEXT_MENU_TRIGGER_ATTR } from "@/lib/ui/context-menu-policy";
import { contrastingTextOnBackground } from "@/lib/settings/color-contrast";
import { resolveTagColor } from "@/lib/library/tag-colors";
import {
  formatCounterLibraryBadgeLabel,
  formatCounterLibraryBadgeTitle,
  isCounterLibraryItem,
} from "@/lib/library/counter-library-badge";
import {
  resolvePlayCreatorLabel,
} from "@/lib/library/play-creator-label";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { LibraryItem } from "@/types/library";

const TYPE_LABEL: Record<LibraryItem["type"], string> = {
  play: "PLAY",
  drill: "DRILL",
  playbook: "Playbook",
};

interface Props {
  items: LibraryItem[];
  selectedIds: ReadonlySet<string>;
  previewId: string | null;
  selectionMode?: "multi" | "single";
  onToggleRow: (id: string) => void;
  onToggleAllFiltered: (checked: boolean) => void;
  onPreview: (id: string) => void;
  onRowContextMenu?: (id: string, e: MouseEvent<HTMLTableRowElement>) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onNewPractice?: () => void;
  showCreatedBy?: boolean;
  creatorNames?: ReadonlyMap<string, string>;
}

export function LibraryTable({
  items,
  selectedIds,
  previewId,
  selectionMode = "multi",
  onToggleRow,
  onToggleAllFiltered,
  onPreview,
  onRowContextMenu,
  page,
  pageSize,
  onPageChange,
  onNewPractice,
  showCreatedBy = false,
  creatorNames,
}: Props) {
  const fieldTagColors = useOrganizerStore((s) => s.fieldTagColors);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = items.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const from = total === 0 ? 0 : safePage * pageSize + 1;
  const to = Math.min(total, (safePage + 1) * pageSize);

  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
  const allFilteredSelected = total > 0 && selectedCount === total;
  const someFilteredSelected = selectedCount > 0 && selectedCount < total;
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected;
    }
  }, [someFilteredSelected]);

  const singleSelect = selectionMode === "single";

  return (
    <div className="org-library-main fd-library-main">
      <div className="org-table-view fd-table-view" id="library-table-wrap">
        <div className="org-table-scroll fd-table-scroll">
          <table className="org-play-table fd-play-table">
            <thead>
              <tr>
                <th className="col-select" aria-label="Select">
                  {singleSelect ? null : (
                    <input
                      type="checkbox"
                      id="library-select-all"
                      className="org-play-row-check library-select-all-check"
                      title="Select all in list"
                      aria-label="Select all in list"
                      ref={selectAllRef}
                      checked={allFilteredSelected}
                      disabled={total === 0}
                      onChange={(e) => onToggleAllFiltered(e.target.checked)}
                    />
                  )}
                </th>
                <th className="col-season">Season</th>
                <th className="col-type">Type</th>
                <th className="col-team">Team</th>
                <th className="col-series">Series</th>
                <th className="col-tags">Tags</th>
                {showCreatedBy ? (
                  <th className="col-created-by">Created By</th>
                ) : null}
                <th className="col-play-name">Play Name</th>
              </tr>
            </thead>
            <tbody id="library-table-body">
              {slice.map((item) => (
                <tr
                  key={item.id}
                  className={previewId === item.id ? "selected" : ""}
                  {...(onRowContextMenu
                    ? { [FC_CONTEXT_MENU_TRIGGER_ATTR]: "" }
                    : {})}
                  onClick={() => onPreview(item.id)}
                  onContextMenu={(e) => {
                    if (!onRowContextMenu) return;
                    e.preventDefault();
                    onRowContextMenu(item.id, e);
                  }}
                >
                  <td className="col-select">
                    <input
                      type={singleSelect ? "radio" : "checkbox"}
                      name={singleSelect ? "library-pick-row" : undefined}
                      className="org-play-row-check"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleRow(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${item.title}`}
                    />
                  </td>
                  <td className="col-season">{item.season || "—"}</td>
                  <td className="col-type">{TYPE_LABEL[item.type]}</td>
                  <td className="col-team">{item.team || "—"}</td>
                  <td className="col-series">{item.series || "—"}</td>
                  <td className="col-tags">
                    {item.tags.length ? (
                      <span className="fd-tag-list">
                        {item.tags.map((tag) => {
                          const background = resolveTagColor(tag, fieldTagColors);
                          return (
                          <span
                            key={tag}
                            className="fd-tag-pill"
                            style={{
                              backgroundColor: background,
                              color: contrastingTextOnBackground(background),
                            }}
                          >
                            {tag}
                          </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="fd-tag-empty">—</span>
                    )}
                  </td>
                  {showCreatedBy ? (
                    <td className="col-created-by">
                      {resolvePlayCreatorLabel(
                        item,
                        creatorNames ?? new Map(),
                      )}
                    </td>
                  ) : null}
                  <td className="col-play-name">
                    <span className="org-play-name-text">{item.title}</span>
                    {item.favorite ? (
                      <span className="fd-pin-indicator" aria-hidden="true">
                        ★
                      </span>
                    ) : null}
                    {isCounterLibraryItem(item) && item.defenseCounter ? (
                      <span
                        className="fd-counter-badge"
                        title={formatCounterLibraryBadgeTitle(item.defenseCounter)}
                      >
                        {formatCounterLibraryBadgeLabel(item.defenseCounter)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fd-table-footer">
          <span className="fd-page-info" id="library-page-info">
            {from}–{to} of {total}
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
          </span>
          {onNewPractice && selectedCount > 0 ? (
            <button
              type="button"
              className="fd-page-btn fd-new-practice-btn"
              id="btn-library-new-practice"
              onClick={onNewPractice}
            >
              New practice
            </button>
          ) : null}
          <div className="fd-pagination">
            <button
              type="button"
              className="fd-page-btn"
              disabled={safePage <= 0}
              onClick={() => onPageChange(0)}
              title="First page"
            >
              «
            </button>
            <button
              type="button"
              className="fd-page-btn"
              disabled={safePage <= 0}
              onClick={() => onPageChange(safePage - 1)}
              title="Previous page"
            >
              ‹
            </button>
            <button
              type="button"
              className="fd-page-btn"
              disabled={safePage >= totalPages - 1}
              onClick={() => onPageChange(safePage + 1)}
              title="Next page"
            >
              ›
            </button>
            <button
              type="button"
              className="fd-page-btn"
              disabled={safePage >= totalPages - 1}
              onClick={() => onPageChange(totalPages - 1)}
              title="Last page"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
