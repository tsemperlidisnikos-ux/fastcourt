"use client";

import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  FORMATION_PRESETS,
  type FormationKey,
} from "@/lib/designer/formations";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (key: FormationKey) => void;
}

export function FormationModal({ open, onClose, onSelect }: Props) {
  const mounted = useClientMounted();

  if (!open || !mounted) return null;

  return createPortal(
    <div
      id="formation-modal"
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box modal-box-wide formation-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formation-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="formation-modal-title">
          Offensive formation
        </div>
        <p className="modal-subtitle">
          Place 5 players on the current frame. Existing offense players will be
          replaced.
        </p>
        <div className="formation-preset-grid" id="formation-preset-grid">
          {(Object.keys(FORMATION_PRESETS) as FormationKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="formation-preset-btn"
              data-formation={key}
              onClick={() => {
                onSelect(key);
                onClose();
              }}
            >
              {FORMATION_PRESETS[key].label}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            id="formation-modal-close"
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
