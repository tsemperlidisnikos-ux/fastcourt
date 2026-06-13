"use client";

import { LINE_ACTION_CHOICES } from "@/lib/designer/action-constants";
import { getActionColor } from "@/lib/designer/action-geometry";
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
      <span className="line-type-float-title">Line</span>
      <div className="line-type-float-grid" id="line-type-float-grid">
        {LINE_ACTION_CHOICES.map((choice) => {
          const accent = getActionColor(choice.value as ActionType);
          return (
            <button
              key={choice.value}
              type="button"
              className={`line-type-float-btn${value === choice.value ? " active" : ""}`}
              data-line-action-type={choice.value}
              title={choice.label}
              aria-label={choice.label}
              style={{ "--line-accent": accent } as React.CSSProperties}
              onClick={() => onChange(choice.value)}
            >
              <span className="line-type-float-btn-icon" aria-hidden="true">
                <LineActionIcon type={choice.value as ActionType} color={accent} />
              </span>
              <span className="line-type-float-btn-label">{choice.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
