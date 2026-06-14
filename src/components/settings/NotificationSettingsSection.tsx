"use client";

import type { NotificationPrefs } from "@/types/user-settings";

export function NotificationSettingsSection({
  prefs,
  onChange,
}: {
  prefs: NotificationPrefs;
  onChange: (next: NotificationPrefs) => void;
}) {
  function patch<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    onChange({ ...prefs, [key]: value });
  }

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="notifications"
    >
      <div className="org-settings-group-title">Notifications</div>
      <p className="org-settings-brand-help">
        In-app reminders. Email notifications can be added when cloud mail is enabled.
      </p>

      <label className="org-settings-toggle-row">
        <input
          type="checkbox"
          checked={prefs.trialExpiryReminder}
          onChange={(e) => patch("trialExpiryReminder", e.target.checked)}
        />
        <span>Show trial expiry reminder in the app</span>
      </label>

      <label className="org-settings-toggle-row">
        <input
          type="checkbox"
          checked={prefs.practiceSessionReminders}
          onChange={(e) => patch("practiceSessionReminders", e.target.checked)}
        />
        <span>Practice session tips and reminders</span>
      </label>
    </section>
  );
}
