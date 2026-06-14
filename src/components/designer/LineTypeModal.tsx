"use client";

import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import { LINE_ACTION_CHOICES } from "@/lib/designer/action-constants";
import { getActionColor } from "@/lib/designer/action-geometry";
import { guessLineActionType } from "@/lib/designer/freehand-geometry";
import { LineActionIcon } from "@/components/designer/LineActionIcon";
import { useDesignerStore } from "@/stores/designer-store";
import type { ActionType } from "@/types/designer";

export function LineTypeModal() {
  const pending = useDesignerStore((s) => s.pendingFreehand);
  const lineActionType = useDesignerStore((s) => s.lineActionType);
  const commit = useDesignerStore((s) => s.commitPendingFreehand);
  const cancel = useDesignerStore((s) => s.cancelPendingFreehand);
  const mounted = useClientMounted();

  if (!pending || !mounted) return null;

  const suggested = guessLineActionType(pending);

  return createPortal(
    <div
      id="line-type-modal"
      className="modal-overlay line-type-overlay"
      role="presentation"
      onClick={() => cancel()}
    >
      <div
        className="modal-box line-type-box"
        role="dialog"
        aria-labelledby="line-type-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="line-type-header">
          <div className="line-type-icon" aria-hidden="true">
            <LineActionIcon type="cut" color="#475569" />
          </div>
          <div>
            <div className="modal-title" id="line-type-title">
              Line type
            </div>
            <p className="line-type-sub">
              Choose the action type for this line
            </p>
          </div>
        </div>
        <div className="line-type-grid" id="line-type-grid">
          {LINE_ACTION_CHOICES.map((choice) => {
            const accent = getActionColor(choice.value as ActionType);
            return (
              <button
                key={choice.value}
                type="button"
                className={`line-type-btn${
                  choice.value === suggested || choice.value === lineActionType
                    ? " suggested"
                    : ""
                }`}
                data-line-type={choice.value}
                style={{ "--line-accent": accent } as React.CSSProperties}
                onClick={() => commit(choice.value as ActionType)}
              >
                <span className="line-type-btn-icon" aria-hidden="true">
                  <LineActionIcon type={choice.value as ActionType} color={accent} />
                </span>
                <span className="line-type-btn-label">{choice.label}</span>
              </button>
            );
          })}
        </div>
        <div className="modal-actions line-type-actions">
          <button
            type="button"
            className="modal-cancel"
            id="line-type-cancel"
            onClick={() => cancel()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
