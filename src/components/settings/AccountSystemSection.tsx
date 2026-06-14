"use client";

import { FormEvent, useState } from "react";
import { APP_BUILD, APP_NAME } from "@/lib/config";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { getCloudConfigIssue } from "@/lib/supabase/env";
import { appNotice } from "@/stores/dialog-store";
import type { AuthSession } from "@/types/auth";

export function AccountSystemSection({
  session,
  showPasswordForm = false,
}: {
  session: AuthSession;
  showPasswordForm?: boolean;
}) {
  const cloud = isCloudEnabled();
  const cloudIssue = getCloudConfigIssue();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  function copyBuildInfo() {
    const text = `${APP_NAME} ${APP_BUILD} · ${session.user.email} · cloud=${cloud}`;
    void navigator.clipboard?.writeText(text);
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      appNotice("Password", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      appNotice("Password", "Passwords do not match.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      appNotice("Password", "Cloud mode is required to change password.");
      return;
    }
    setPasswordBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        appNotice("Password", error.message);
        return;
      }
      setPassword("");
      setConfirmPassword("");
      appNotice("Password", "Password updated.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="org-settings-group is-active-section" data-settings-section="account">
      <div className="org-settings-group-title">Account &amp; system</div>

      <dl className="admin-user-detail-grid">
        <div>
          <dt>Display name</dt>
          <dd>{session.user.displayName}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{session.user.role}</dd>
        </div>
        {session.user.organizationName ? (
          <div>
            <dt>Organization</dt>
            <dd>{session.user.organizationName}</dd>
          </div>
        ) : null}
        <div>
          <dt>Build</dt>
          <dd>{APP_BUILD}</dd>
        </div>
        <div>
          <dt>Cloud</dt>
          <dd>{cloud ? "Supabase configured" : cloudIssue ?? "Local only"}</dd>
        </div>
      </dl>

      {showPasswordForm && session.cloud ? (
        <form className="org-settings-password-form" onSubmit={handlePasswordChange}>
          <div className="org-settings-sublabel">Change password</div>
          <label className="org-settings-brand-field">
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </label>
          <label className="org-settings-brand-field">
            <span>Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
            />
          </label>
          <button
            type="submit"
            className="org-settings-btn"
            disabled={passwordBusy || !password}
          >
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      ) : null}

      <div className="org-settings-system-info">
        <div className="org-settings-sublabel">App &amp; support</div>
        <div className="org-settings-system-info-actions">
          <span className="org-settings-build">
            {APP_NAME} {APP_BUILD}
          </span>
          <button type="button" className="org-settings-link" onClick={copyBuildInfo}>
            Copy for support
          </button>
        </div>
        {!cloud ? (
          <p className="org-settings-hint">
            Local mode: library and settings stay in this browser. Use Import &amp;
            export to move data between devices.
          </p>
        ) : (
          <p className="org-settings-hint">
            Cloud mode: account settings sync to your profile. Library replication
            continues in a future release.
          </p>
        )}
      </div>
    </section>
  );
}
