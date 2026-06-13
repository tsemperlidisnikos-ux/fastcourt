"use client";

import type { ReactNode } from "react";
import type { ShadowType } from "@/lib/designer/shadow-geometry";

const SHADOW_CHOICES: Array<{ type: ShadowType; title: string; icon: ReactNode }> = [
  {
    type: "rect",
    title: "Rectangle",
    icon: (
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <rect x="4" y="10" width="24" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.8" />
      </svg>
    ),
  },
  {
    type: "circle",
    title: "Circle",
    icon: (
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="2.8" />
      </svg>
    ),
  },
  {
    type: "triangle",
    title: "Triangle",
    icon: (
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <path d="M16 7 L26 24 L6 24 Z" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    type: "diamond",
    title: "Diamond",
    icon: (
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <rect x="8" y="8" width="16" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2.8" transform="rotate(45 16 16)" />
      </svg>
    ),
  },
];

interface Props {
  value: ShadowType;
  onChange: (type: ShadowType) => void;
}

export function ShadowTypeBar({ value, onChange }: Props) {
  return (
    <div className="shadow-type-bar" id="shadow-type-bar" aria-label="Shadow shape">
      {SHADOW_CHOICES.map((choice) => (
        <button
          key={choice.type}
          type="button"
          className={`shadow-type-btn${value === choice.type ? " active" : ""}`}
          data-shadow={choice.type}
          title={choice.title}
          aria-label={choice.title}
          onClick={() => onChange(choice.type)}
        >
          {choice.icon}
        </button>
      ))}
    </div>
  );
}
