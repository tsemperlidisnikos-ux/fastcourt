"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import type { StoredPlay } from "@/types/library";

interface Props {
  open: boolean;
  plays: StoredPlay[];
  existingPlayIds: Set<string>;
  onClose: () => void;
  onConfirm: (playIds: string[]) => void;
}

export function PracticeAddModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <PracticeAddModalBody {...props} />;
}

function PracticeAddModalBody({
  plays,
  existingPlayIds,
  onClose,
  onConfirm,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plays.filter((play) => {
      if (play.type === "playbook") return false;
      if (existingPlayIds.has(play.id)) return false;
      if (!q) return true;
      const hay = [play.title, play.team, play.series, play.type]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [plays, existingPlayIds, search]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return createPortal(
    <div className="modal-overlay active" role="presentation" onClick={onClose}>
      <div
        className="modal-box modal-box-wide practice-add-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-add-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="practice-add-modal-title">
          Add to practice session
        </div>
        <p className="modal-subtitle">
          Select plays and drills from your library.
        </p>
        <div className="modal-field">
          <input
            type="search"
            id="practice-add-search"
            placeholder="Search by name, team, or series…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="practice-add-toolbar">
          <button
            type="button"
            className="practice-add-tool-btn"
            onClick={() => setSelected(new Set(filtered.map((p) => p.id)))}
          >
            Select all
          </button>
          <button
            type="button"
            className="practice-add-tool-btn"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
          <span className="practice-add-count">{selected.size} selected</span>
        </div>
        <div className="practice-add-list" id="practice-add-list">
          {!filtered.length ? (
            <div className="practice-items-empty">
              {search.trim()
                ? "No matching items."
                : "All library items are already in this session."}
            </div>
          ) : (
            filtered.map((play) => (
              <label key={play.id} className="practice-add-row">
                <input
                  type="checkbox"
                  checked={selected.has(play.id)}
                  onChange={(e) => toggle(play.id, e.target.checked)}
                />
                <div className="practice-add-row-main">
                  <div className="practice-add-row-title">{play.title}</div>
                  <div className="practice-add-row-meta">
                    {play.team || "No Team"} · {play.series || "General"} ·{" "}
                    {play.type === "drill" ? "Drill" : "Play"}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-create"
            onClick={() => {
              onConfirm([...selected]);
              onClose();
            }}
          >
            Add to session
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
