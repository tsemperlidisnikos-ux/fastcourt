"use client";

import { ZONE_PRESETS, ZONE_TYPES, type ZoneType } from "@/lib/designer/zone-geometry";

interface Props {
  value: ZoneType;
  onChange: (type: ZoneType) => void;
}

export function ZoneTypeBar({ value, onChange }: Props) {
  return (
    <div className="zone-type-bar" id="zone-type-bar" aria-label="Zone type">
      {ZONE_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          className={`zone-type-btn${value === type ? " active" : ""}`}
          data-zone={type}
          title={ZONE_PRESETS[type].label}
          onClick={() => onChange(type)}
        >
          {ZONE_PRESETS[type].label}
        </button>
      ))}
    </div>
  );
}
