"use client";

import { useState } from "react";
import { isCloudEnabled } from "@/lib/supabase/client";
import { getCloudConfigIssue } from "@/lib/supabase/env";
import { persistSettingsForUser } from "@/lib/settings/user-settings-sync";
import { loadScopedUserSettings } from "@/lib/settings/user-settings-storage";
import { DEFAULT_PDF_BRAND } from "@/lib/settings/pdf-branding";
import { useSettingsStore } from "@/stores/settings-store";
import type { AuthSession } from "@/types/auth";
import { appNotice } from "@/stores/dialog-store";

export function CloudSyncSection({ session }: { session: AuthSession }) {
  const cloudSyncedAt = useSettingsStore((s) => s.cloudSyncedAt);
  const [syncing, setSyncing] = useState(false);
  const cloud = isCloudEnabled();
  const cloudIssue = getCloudConfigIssue();

  async function handleSyncNow() {
    if (!session.cloud) {
      appNotice("Cloud sync", "Sign in with cloud mode to sync settings.");
      return;
    }
    setSyncing(true);
    try {
      const state = useSettingsStore.getState();
      const scoped = loadScopedUserSettings(session.user.id);
      const pdfBrandForBundle =
        state.useOrgBranding && scoped.pdfBrand
          ? { ...DEFAULT_PDF_BRAND, ...scoped.pdfBrand }
          : state.pdfBrand;

      const result = await persistSettingsForUser(session.user, {
        appearance: state.appearance,
        pdfBrand: pdfBrandForBundle,
        practiceLive: state.practiceLive,
        designer: state.designer,
        notifications: state.notifications,
        useOrgBranding: state.useOrgBranding,
        devices: scoped.devices,
        cloudSyncedAt: new Date().toISOString(),
      });
      if (!result.ok) {
        appNotice("Cloud sync", result.error);
        return;
      }
      useSettingsStore.setState({ cloudSyncedAt: new Date().toISOString() });
      appNotice("Cloud sync", "Settings saved to your account.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="cloud-sync"
    >
      <div className="org-settings-group-title">Cloud sync</div>
      <p className="org-settings-brand-help">
        Appearance, branding, and preferences sync to your account when cloud mode
        is on. Library plays stay on this device until full cloud library ships.
      </p>

      <dl className="admin-user-detail-grid">
        <div>
          <dt>Status</dt>
          <dd>{cloud ? "Supabase connected" : cloudIssue ?? "Local only"}</dd>
        </div>
        <div>
          <dt>Last settings sync</dt>
          <dd>
            {cloudSyncedAt
              ? new Date(cloudSyncedAt).toLocaleString()
              : session.cloud
                ? "Not synced yet"
                : "—"}
          </dd>
        </div>
        <div>
          <dt>Library</dt>
          <dd>IndexedDB on this device (Phase 4)</dd>
        </div>
      </dl>

      <button
        type="button"
        className="org-settings-btn"
        disabled={!session.cloud || syncing}
        onClick={() => void handleSyncNow()}
      >
        {syncing ? "Syncing…" : "Sync settings now"}
      </button>
    </section>
  );
}
