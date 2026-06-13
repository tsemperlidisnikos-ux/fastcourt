"use client";

import { APP_BUILD, APP_NAME } from "@/lib/config";
import { isCloudEnabled } from "@/lib/supabase/client";
import type { AuthSession } from "@/types/auth";

export function AccountSystemSection({ session }: { session: AuthSession }) {
  const cloud = isCloudEnabled();

  function copyBuildInfo() {
    const text = `${APP_NAME} ${APP_BUILD} · ${session.user.email} · cloud=${cloud}`;
    void navigator.clipboard?.writeText(text);
  }

  return (
    <section className="org-settings-group is-active-section" data-settings-section="account">
      <div className="org-settings-group-title">Account &amp; system</div>

      <dl className="admin-user-detail-grid">
        <div>
          <dt>Email</dt>
          <dd>{session.user.email}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{session.user.role}</dd>
        </div>
        <div>
          <dt>Build</dt>
          <dd>{APP_BUILD}</dd>
        </div>
        <div>
          <dt>Cloud</dt>
          <dd>{cloud ? "Supabase configured" : "Local only"}</dd>
        </div>
      </dl>

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
            Cloud sync: profiles and library replication continue in Phase 4.
          </p>
        )}
      </div>
    </section>
  );
}
