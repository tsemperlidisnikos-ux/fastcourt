"use client";

import type { DesignerUserPrefs } from "@/types/user-settings";

export function DesignerDefaultsSection({
  prefs,
  onChange,
}: {
  prefs: DesignerUserPrefs;
  onChange: (next: DesignerUserPrefs) => void;
}) {
  function patch<K extends keyof DesignerUserPrefs>(key: K, value: DesignerUserPrefs[K]) {
    onChange({ ...prefs, [key]: value });
  }

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="designer"
    >
      <div className="org-settings-group-title">Designer defaults</div>
      <p className="org-settings-brand-help">
        Default court zoom when you open the designer.
      </p>

      <label className="org-settings-brand-field">
        <span>Default court zoom ({prefs.defaultCourtZoom}%)</span>
        <input
          type="range"
          min={50}
          max={150}
          step={5}
          value={prefs.defaultCourtZoom}
          onChange={(e) => patch("defaultCourtZoom", Number(e.target.value))}
        />
      </label>
    </section>
  );
}
