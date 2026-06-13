"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  formatLibrarySummary,
  type AdminLibraryItem,
  type AdminLibrarySummary,
} from "@/lib/library/admin-library-summary";

interface Props {
  open: boolean;
  title: string;
  subtitle?: string;
  summary: AdminLibrarySummary | null;
  groupBy: "playbook" | "coach";
  onClose: () => void;
}

function groupItems(items: AdminLibraryItem[], groupBy: "playbook" | "coach") {
  const groups = new Map<string, AdminLibraryItem[]>();
  for (const item of items) {
    const key =
      groupBy === "coach"
        ? `${item.coachName || "Coach"}|${item.coachEmail || ""}`
        : item.playbook;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function AdminLibraryContentModal({
  open,
  title,
  subtitle,
  summary,
  groupBy,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !summary) return null;

  const groups = groupItems(summary.items, groupBy);

  return createPortal(
    <div
      className="modal-overlay active"
      id="admin-user-library-modal"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-box modal-box-wide admin-library-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-library-title"
      >
        <div className="modal-title" id="admin-library-title">
          {title}
        </div>
        {subtitle ? (
          <div className="modal-subtitle" id="admin-library-subtitle">
            {subtitle}
          </div>
        ) : null}

        <div className="admin-library-summary" id="admin-library-summary">
          <span className="admin-library-summary-badge">
            {formatLibrarySummary(summary)}
          </span>
          {summary.coachesWithContent != null ? (
            <span className="admin-library-summary-badge">
              {summary.coachesWithContent} of {summary.coachCount ?? 0} coaches
              with content
            </span>
          ) : null}
        </div>

        {summary.totalItems === 0 ? (
          <div className="admin-library-empty" id="admin-library-empty">
            No content to show yet.
          </div>
        ) : (
          <div className="admin-library-content" id="admin-library-content">
            {groups.map(([groupKey, groupItems]) => {
              const [coachName, coachEmail] = groupKey.split("|");
              return (
                <section key={groupKey} className="admin-library-section">
                  <div className="admin-library-section-title">
                    {groupBy === "coach" ? (
                      <>
                        {coachName}
                        {coachEmail ? (
                          <span className="admin-library-section-sub">
                            {" "}
                            · {coachEmail}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      groupKey
                    )}
                  </div>
                  <ul className="admin-library-list">
                    {groupItems.map((item) => (
                      <li key={`${groupKey}-${item.id}`} className="admin-library-item">
                        <div className="admin-library-item-main">
                          <span
                            className={`admin-library-type admin-library-type-${item.type}`}
                          >
                            {item.type === "drill" ? "Drill" : "Play"}
                          </span>
                          <span className="admin-library-item-name">{item.name}</span>
                        </div>
                        <div className="admin-library-item-meta">
                          {groupBy === "coach" ? item.playbook : item.team} ·{" "}
                          {item.frames} frame{item.frames === 1 ? "" : "s"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            id="admin-library-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
