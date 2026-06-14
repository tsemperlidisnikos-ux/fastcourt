"use client";

import { useState } from "react";
import {
  previewPurgeApplicationData,
  purgeApplicationDataExceptAdmin,
  type PurgePreview,
} from "@/lib/admin/purge-application-data";
import { isAdminRecord } from "@/lib/auth/admin-users";
import { loadTeamOrganizations } from "@/lib/auth/team-organizations";
import { ROLES } from "@/lib/config";
import type { AdminUserRecord } from "@/types/admin-user";
import type { AuthSession } from "@/types/auth";
import type { TeamOrganization } from "@/types/team-org";
import { appConfirm, appNotice } from "@/stores/dialog-store";
import { useLibraryStore } from "@/stores/library-store";
import { useOrganizerStore } from "@/stores/organizer-store";

function formatPreview(preview: PurgePreview) {
  return [
    `${preview.usersRemoved} user(s) removed · ${preview.usersKept} kept`,
    `${preview.orgsRemoved} organization(s) removed · ${preview.orgsKept} kept`,
    `${preview.playsRemoved} play/drill(s) removed · ${preview.playsKept} kept`,
    `${preview.playbooksRemoved} playbook(s) removed · ${preview.playbooksKept} kept`,
    `${preview.practiceSessionsRemoved} practice session(s) cleared`,
    `${preview.playerRosterKeysRemoved} player roster(s) cleared`,
    `${preview.scopedSettingsRemoved} other user settings bundle(s) cleared`,
  ].join("\n");
}

export function AdminPurgeSection({
  session,
  users,
  onUsersChange,
  onOrgsChange,
}: {
  session: AuthSession;
  users: AdminUserRecord[];
  onUsersChange: (users: AdminUserRecord[]) => void;
  onOrgsChange: (orgs: TeamOrganization[]) => void;
}) {
  const refreshLibrary = useLibraryStore((s) => s.refresh);
  const loadOrganizerMeta = useOrganizerStore((s) => s.loadMeta);
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (session.user.role !== ROLES.admin) {
    return null;
  }

  async function handlePreview() {
    setBusy(true);
    setStatus(null);
    try {
      const next = await previewPurgeApplicationData(session.user, users);
      setPreview(next);
      setStatus("Preview ready. Review the counts below before purging.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not build preview.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function handlePurge() {
    if (!preview) {
      setStatus("Run preview first.");
      return;
    }

    const confirmed = await appConfirm({
      title: "Purge all other data?",
      message:
        "This permanently removes other users, organizations, coach library content, practice sessions, and rosters from this browser. Your administrator account, your library content, and organizations where you are team admin are kept. Cloud profile rows are removed when Supabase admin delete policies are enabled.",
      confirmLabel: "Purge now",
      danger: true,
    });
    if (!confirmed) return;

    const typed = window.prompt('Type PURGE to confirm this cannot be undone.');
    if (typed?.trim().toUpperCase() !== "PURGE") {
      appNotice("Purge cancelled", "Confirmation text did not match.");
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await purgeApplicationDataExceptAdmin(session.user, users);
      onUsersChange(users.filter((u) => isAdminRecord(u)));
      onOrgsChange(loadTeamOrganizations());
      await Promise.all([refreshLibrary(), loadOrganizerMeta()]);

      const cloudNote = result.cloudError
        ? ` Cloud cleanup warning: ${result.cloudError}`
        : result.cloudProfilesRemoved || result.cloudSettingsRemoved
          ? ` Cloud: ${result.cloudProfilesRemoved} profile(s), ${result.cloudSettingsRemoved} settings row(s) removed.`
          : "";

      setStatus(
        `Purge complete. Removed ${result.playsRemoved} plays, ${result.usersRemoved} users, ${result.orgsRemoved} organizations.${cloudNote}`,
      );
      setPreview(null);
      appNotice("Purge complete", "Other users' data was removed from this device.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Purge failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="org-settings-group org-settings-danger-zone"
      data-settings-section="admin-purge"
    >
      <div className="org-settings-group-title">Danger zone</div>
      <p className="org-settings-brand-help">
        Remove all application data except your master administrator account, your
        plays and playbooks on this device, and team organizations where you are
        the team admin. Billing, appearance, and your PDF branding are not reset.
      </p>

      {status ? <p className="org-settings-tools-status">{status}</p> : null}

      {preview ? (
        <pre className="org-settings-purge-preview">{formatPreview(preview)}</pre>
      ) : null}

      <div className="org-settings-tools-grid">
        <button
          type="button"
          className="org-settings-btn"
          disabled={busy}
          onClick={() => void handlePreview()}
        >
          {busy ? "Working…" : "Preview purge"}
        </button>
        <button
          type="button"
          className="org-settings-btn org-settings-btn-danger"
          disabled={busy || !preview}
          onClick={() => void handlePurge()}
        >
          Purge other users&apos; data
        </button>
      </div>
    </section>
  );
}
