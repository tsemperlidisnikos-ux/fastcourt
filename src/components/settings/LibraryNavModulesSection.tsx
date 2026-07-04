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
        {LIBRARY_NAV_TABS.map((tab) => (
          <label key={tab.id} className="admin-library-nav-module-row">
            <input
              type="checkbox"
              checked={config[tab.id]}
              onChange={(e) => toggle(tab.id, e.target.checked)}
            />
            <span className="admin-library-nav-module-label">
              {tab.label}
            </span>
            <span className="admin-library-nav-module-hint">
              {LIBRARY_NAV_MODULE_LABELS[tab.id]}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
