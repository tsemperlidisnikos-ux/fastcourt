"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { LibraryItem } from "@/types/library";

function SwipeRow({
  enabled,
  selected,
  onActivate,
  onContextMenu,
  children,
}: {
  enabled: boolean;
  selected?: boolean;
  onActivate: () => void;
  onContextMenu?: (e: MouseEvent<HTMLTableRowElement>) => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);

  return (
    <tr
      className={`${selected ? "selected" : ""}${enabled ? " fc-fd-swipe-host" : ""}`}
      style={enabled ? { transform: `translateX(${offset}px)` } : undefined}
      onClick={onActivate}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e);
      }}
      onTouchStart={
        enabled
          ? (e) => {
              startX.current = e.touches[0]?.clientX ?? 0;
            }
          : undefined
      }
      onTouchMove={
        enabled
          ? (e) => {
              const x = e.touches[0]?.clientX ?? 0;
              setOffset(Math.max(-72, Math.min(72, x - startX.current)));
            }
          : undefined
      }
      onTouchEnd={
        enabled
          ? () => {
              if (offset > 40) onActivate();
              setOffset(0);
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

const TYPE_LABEL: Record<LibraryItem["type"], string> = {
  play: "Play",
  drill: "Drill",
  playbook: "Playbook",
};

interface Props {
  items: LibraryItem[];
  selectedIds: ReadonlySet<string>;
  previewId: string | null;
  onToggleRow: (id: string) => void;
  onToggleAllFiltered: (checked: boolean) => void;
  onPreview: (id: string) => void;
  onRowContextMenu?: (id: string, e: MouseEvent<HTMLTableRowElement>) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onNewPractice?: () => void;
  tabletMode?: boolean;
}

export function LibraryTable({
  items,
  selectedIds,
  previewId,
  onToggleRow,
  onToggleAllFiltered,
  onPreview,
  onRowContextMenu,
  page,
  pageSize,
  onPageChange,
  onNewPractice,
  tabletMode = false,
}: Props) {
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

  return (
    <div className="org-library-main fd-library-main">
      <div className="org-table-view fd-table-view" id="library-table-wrap">
        <div className="org-table-scroll fd-table-scroll">
          <table className="org-play-table fd-play-table">
            <thead>
              <tr>
                <th className="col-select" aria-label="Select">
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
                </th>
                <th className="col-season">Season</th>
                <th className="col-type">Type</th>
                <th className="col-team">Team</th>
                <th className="col-series">Series</th>
                <th className="col-tags">Tags</th>
                <th className="col-play-name">Play Name</th>
              </tr>
            </thead>
            <tbody id="library-table-body">
              {slice.map((item) => (
                <SwipeRow
                  key={item.id}
                  enabled={tabletMode}
                  selected={previewId === item.id}
                  onActivate={() => onPreview(item.id)}
                  onContextMenu={
                    onRowContextMenu
                      ? (e) => onRowContextMenu(item.id, e)
                      : undefined
                  }
                >
                  <td className="col-select">
                    <input
                      type="checkbox"
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
                        {item.tags.map((tag) => (
                          <span key={tag} className="fd-tag-pill fd-tag-dark">
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="fd-tag-empty">—</span>
                    )}
                  </td>
                  <td className="col-play-name">
                    <span className="org-play-name-text">{item.title}</span>
                    {item.favorite ? (
                      <span className="fd-pin-indicator" aria-hidden="true">
                        ★
                      </span>
                    ) : null}
                  </td>
                </SwipeRow>
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
