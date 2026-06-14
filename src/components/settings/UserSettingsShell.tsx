"use client";

import { APP_BUILD, APP_NAME } from "@/lib/config";
import { appConfirm } from "@/stores/dialog-store";

export type UserSettingsNavItem = {
  id: string;
  label: string;
};

export type UserSettingsNavGroup = {
  label: string;
  items: UserSettingsNavItem[];
};

export function UserSettingsShell({
  title,
  subtitle,
  navGroups,
  navId,
  onNavChange,
  dirty,
  onApply,
  onClose,
  children,
  className = "",
}: {
  title?: string;
  subtitle: string;
  navGroups: UserSettingsNavGroup[];
  navId: string;
  onNavChange: (id: string) => void;
  dirty: boolean;
  onApply: () => void;
  onClose: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`fc-admin-settings org-settings-overlay ${className}`.trim()}>
      <div className="org-settings-box is-admin-mode">
        <header className="org-settings-head">
          <div>
            <h2 className="org-settings-head-title">{title ?? "Settings"}</h2>
            <p className="org-settings-head-user">{subtitle}</p>
          </div>
        </header>

        <div className="org-settings-body">
          <div className="org-settings-workspace">
            <aside className="org-settings-nav-panel">
              <div className="org-settings-nav-list">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <div className="org-settings-nav-group-label">{group.label}</div>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`org-settings-nav-item${navId === item.id ? " is-selected" : ""}`}
                        onClick={() => onNavChange(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="org-settings-nav-footer">
                <span className="org-settings-nav-version">
                  {APP_NAME} {APP_BUILD}
                </span>
              </div>
            </aside>

            <div className="org-settings-content-panel">
              <div className="org-settings-section-stack">{children}</div>
            </div>
          </div>
        </div>

        <div className="org-settings-footer">
          <div className="org-settings-footer-left">
            <span className="org-settings-build">
              {APP_NAME} {APP_BUILD}
            </span>
          </div>
          <div className="org-settings-footer-actions">
            {dirty ? (
              <span className="org-settings-dirty-hint">Unsaved changes</span>
            ) : null}
            <button
              type="button"
              className={`org-settings-apply${dirty ? " has-unsaved-changes" : ""}`}
              onClick={onApply}
            >
              Apply
            </button>
            <button
              type="button"
              className="org-settings-close"
              onClick={() => void onClose()}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function confirmDiscardSettings(dirty: boolean): Promise<boolean> {
  if (!dirty) return true;
  return appConfirm({
    title: "Discard changes",
    message: "Discard unsaved changes?",
    confirmLabel: "Discard",
    danger: true,
  });
}
