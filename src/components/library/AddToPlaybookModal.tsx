"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { PlaybookSection } from "@/types/library-meta";

interface Props {
  open: boolean;
  playbooks: PlaybookSection[];
  playTitle: string;
  onClose: () => void;
  onSelect: (playbookId: string) => void;
}

export function AddToPlaybookModal({
  open,
  playbooks,
  playTitle,
  onClose,
  onSelect,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box modal-box-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-playbook-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="add-playbook-modal-title">
          Add to playbook
        </div>
        <p className="modal-subtitle">
          Choose a playbook for &ldquo;{playTitle}&rdquo;.
        </p>
        {playbooks.length === 0 ? (
          <p className="text-sm text-[#64748b]">
            No playbooks yet. Create one from the Playbooks tab first.
          </p>
        ) : (
          <div className="formation-preset-grid">
            {playbooks.map((book) => (
              <button
                key={book.id}
                type="button"
                className="formation-preset-btn"
                onClick={() => {
                  onSelect(book.id);
                  onClose();
                }}
              >
                {book.name}
              </button>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
