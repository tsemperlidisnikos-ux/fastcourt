"use client";

import { LIBRARY_NAV_MODULE_LABELS, LIBRARY_NAV_TABS } from "@/lib/library/library-nav-tabs";
import { LIBRARY_NAV_MODULE_IDS, type LibraryNavModulesConfig } from "@/types/library-nav-modules";

interface Props {
  config: LibraryNavModulesConfig;
  onChange: (next: LibraryNavModulesConfig) => void;
}

export function LibraryNavModulesSection({ config, onChange }: Props) {
  function toggle(id: (typeof LIBRARY_NAV_MODULE_IDS)[number], enabled: boolean) {
    onChange({ ...config, [id]: enabled });
  }

  return (
    <section
      className="org-settings-group org-settings-library-nav-section is-active-section"
      data-settings-section="library-modules"
    >
      <h2 className="org-settings-group-title">Library navigation</h2>
      <p className="org-settings-brand-help">
        Choose which sections appear in the library header for all coaches. At
        least one section must stay visible. Saved with Apply.
      </p>
      <div className="admin-library-nav-modules">
        {LIBRARY_NAV_TABS.filter((tab) =>
          (LIBRARY_NAV_MODULE_IDS as readonly string[]).includes(tab.id),
        ).map((tab) => (
          <label key={tab.id} className="admin-library-nav-module-row">
            <input
              type="checkbox"
              checked={config[tab.id as keyof LibraryNavModulesConfig]}
              onChange={(e) =>
                toggle(tab.id as (typeof LIBRARY_NAV_MODULE_IDS)[number], e.target.checked)
              }
            />
            <span className="admin-library-nav-module-label">
              {tab.label}
            </span>
            <span className="admin-library-nav-module-hint">
              {LIBRARY_NAV_MODULE_LABELS[tab.id as keyof typeof LIBRARY_NAV_MODULE_LABELS]}
            </span>
          </label>
        ))}
      </div>
      <p className="org-settings-brand-help">
        The Coach tab appears when Practice or Film Room is enabled.
      </p>
    </section>
  );
}
