"use client";

import { useEffect, useState } from "react";
import {
  readLibraryCloudSyncedAt,
  syncLibraryForUser,
} from "@/lib/cloud/library-sync";
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
  const [syncingSettings, setSyncingSettings] = useState(false);
  const [syncingLibrary, setSyncingLibrary] = useState(false);
  const [librarySyncedAt, setLibrarySyncedAt] = useState<string | null>(null);
  const cloud = isCloudEnabled();
  const cloudIssue = getCloudConfigIssue();

  useEffect(() => {
    if (session.cloud) {
      setLibrarySyncedAt(readLibraryCloudSyncedAt(session.user.id));
    }
  }, [session.cloud, session.user.id]);

  async function handleSyncSettings() {
    if (!session.cloud) {
      appNotice("Cloud sync", "Sign in with cloud mode to sync settings.");
      return;
    }
    setSyncingSettings(true);
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
      setSyncingSettings(false);
    }
  }

  async function handleSyncLibrary() {
    if (!session.cloud) {
      appNotice("Library sync", "Sign in with cloud mode to sync your library.");
      return;
    }
    setSyncingLibrary(true);
    try {
      const result = await syncLibraryForUser(session.user);
      if (!result.ok) {
        appNotice("Library sync", result.error);
        return;
      }
      const {
        playCount,
        playbookCount,
        practiceCount,
        mergedFromCloud,
        skippedLazy,
        syncedAt,
      } = result.result;
      setLibrarySyncedAt(syncedAt);
      const noticeParts = [
        `${playCount} plays`,
        `${playbookCount} playbooks`,
        `${practiceCount} practice sessions`,
      ].join(", ") + " synced.";
      const extras: string[] = [];
      if (mergedFromCloud > 0) {
        extras.push(`${mergedFromCloud} item(s) pulled from cloud.`);
      }
      if (skippedLazy > 0) {
        extras.push(`${skippedLazy} pending import(s) skipped.`);
      }
      appNotice(
        "Library sync",
        extras.length ? `${noticeParts} ${extras.join(" ")}` : noticeParts,
      );
    } finally {
      setSyncingLibrary(false);
    }
  }

  const busy = syncingSettings || syncingLibrary;

  return (
    <section
      className="org-settings-group is-active-section"
      data-settings-section="cloud-sync"
    >
      <div className="org-settings-group-title">Cloud sync</div>
      <p className="org-settings-brand-help">
        Appearance and preferences sync to your account. Plays, playbooks, practice
        sessions, and organizer fields merge across devices — the newest version
        wins. Deletions sync too. Library also syncs automatically when you sign in.
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
          <dt>Last library sync</dt>
          <dd>
            {librarySyncedAt
              ? new Date(librarySyncedAt).toLocaleString()
              : session.cloud
                ? "Not synced yet"
                : "—"}
          </dd>
        </div>
      </dl>

      <div className="org-settings-btn-row">
        <button
          type="button"
          className="org-settings-btn"
          disabled={!session.cloud || busy}
          onClick={() => void handleSyncSettings()}
        >
          {syncingSettings ? "Syncing…" : "Sync settings now"}
        </button>
        <button
          type="button"
          className="org-settings-btn"
          disabled={!session.cloud || busy}
          onClick={() => void handleSyncLibrary()}
        >
          {syncingLibrary ? "Syncing…" : "Sync library now"}
        </button>
      </div>
    </section>
  );
}
