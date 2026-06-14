"use client";

import {
  loadPracticeLivePrefs,
  savePracticeLivePrefs,
  type PracticeLivePrefs,
} from "@/lib/practice/live-prefs";

export function PracticeLiveSettingsSection({
  prefs,
  onChange,
}: {
  prefs: PracticeLivePrefs;
  onChange: (next: PracticeLivePrefs) => void;
}) {
  function patch<K extends keyof PracticeLivePrefs>(key: K, value: PracticeLivePrefs[K]) {
    const next = { ...prefs, [key]: value };
    onChange(next);
    savePracticeLivePrefs(next);
  }

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="practice-live"
    >
      <div className="org-settings-group-title">Practice (live gym)</div>
      <p className="org-settings-brand-help">
        Preferences for live practice mode on court — timer and sound behavior.
      </p>

      <label className="org-settings-toggle-row">
        <input
          type="checkbox"
          checked={prefs.autoStartTimer}
          onChange={(e) => patch("autoStartTimer", e.target.checked)}
        />
        <span>Auto-start timer when a cue block begins</span>
      </label>

      <label className="org-settings-toggle-row">
        <input
          type="checkbox"
          checked={prefs.timerSound}
          onChange={(e) => patch("timerSound", e.target.checked)}
        />
        <span>Play sound when timer ends</span>
      </label>
    </section>
  );
}

export { loadPracticeLivePrefs };
