"use client";

import type { ReactNode } from "react";
import type { DefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import { GuardMarkerGlyph } from "@/components/designer/GuardMarkerGlyph";

const CHOICES: Array<{
  style: DefenseMarkerStyle;
  title: string;
  icon: ReactNode;
}> = [
  {
    style: "mark",
    title: "X marker",
    icon: (
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
        <path d="M9 9 L23 23" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M23 9 L9 23" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    style: "guard",
    title: "Guard (rotatable)",
    icon: <GuardMarkerGlyph mode="svg" size={32} label="1" />,
  },
];

interface Props {
  value: DefenseMarkerStyle;
  onChange: (style: DefenseMarkerStyle) => void;
}

export function DefenseStyleBar({ value, onChange }: Props) {
  return (
    <div className="shadow-type-bar defense-style-bar" aria-label="Defense marker style">
      {CHOICES.map((choice) => (
        <button
          key={choice.style}
          type="button"
          className={`shadow-type-btn${value === choice.style ? " active" : ""}`}
          data-defense-style={choice.style}
          title={choice.title}
          aria-label={choice.title}
          onClick={() => onChange(choice.style)}
        >
          {choice.icon}
        </button>
      ))}
    </div>
  );
}
