"use client";

import { LINE_TYPE_BAR_CHOICES } from "@/lib/designer/action-constants";
import { LineActionIcon } from "@/components/designer/LineActionIcon";
import type { ActionType } from "@/types/designer";

interface Props {
  value: ActionType;
  onChange: (type: ActionType) => void;
}

export function LineTypeBar({ value, onChange }: Props) {
  return (
    <div
      id="line-type-float-bar"
      className="line-type-float-bar"
      aria-label="Line type"
    >
      <div className="line-type-float-grid" id="line-type-float-grid">
        {LINE_TYPE_BAR_CHOICES.map((choice) => (
          <button
            key={choice.value}
            type="button"
            className={`line-type-float-btn${value === choice.value ? " active" : ""}`}
            data-line-action-type={choice.value}
            title={choice.label}
            aria-label={choice.label}
            onClick={() => onChange(choice.value)}
          >
            <span className="line-type-float-btn-icon" aria-hidden="true">
              <LineActionIcon type={choice.value} color="currentColor" />
            </span>
            <span className="line-type-float-btn-label">{choice.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
