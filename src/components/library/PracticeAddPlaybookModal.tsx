"use client";

import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import type { PlaybookSection } from "@/types/library-meta";

interface Props {
  open: boolean;
  playbooks: PlaybookSection[];
  onClose: () => void;
  onSelect: (playbookId: string) => void;
}

export function PracticeAddPlaybookModal({
  open,
  playbooks,
  onClose,
  onSelect,
}: Props) {
  const mounted = useClientMounted();
  if (!mounted || !open) return null;

  const available = playbooks.filter((pb) => pb.playRefs.length > 0);

  return createPortal(
    <div
      className="modal-overlay active"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box practice-add-playbook-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-add-playbook-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-title" id="practice-add-playbook-title">
          Add playbook
        </h2>
        <p className="modal-subtitle">
          Add every play in a playbook to this session plan.
        </p>
        {!available.length ? (
          <p className="practice-add-playbook-empty">
            No playbooks with plays yet. Create one on the Playbooks tab first.
          </p>
        ) : (
          <ul className="practice-add-playbook-list">
            {available.map((pb) => (
              <li key={pb.id}>
                <button
                  type="button"
                  className="practice-add-playbook-item"
                  onClick={() => {
                    onSelect(pb.id);
                    onClose();
                  }}
                >
                  <span className="practice-add-playbook-name">{pb.name}</span>
                  <span className="practice-add-playbook-meta">
                    {pb.playRefs.length} play{pb.playRefs.length !== 1 ? "s" : ""}
                    {pb.team ? ` · ${pb.team}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
