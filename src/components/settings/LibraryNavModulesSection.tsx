"use client";

import { useState } from "react";
import { LIBRARY_NAV_MODULE_LABELS, LIBRARY_NAV_TABS } from "@/lib/library/library-nav-tabs";
import {
  reorderLibraryNavModules,
} from "@/lib/settings/library-nav-modules";
import type { LibraryNavModuleId, LibraryNavModulesConfig } from "@/types/library-nav-modules";

interface Props {
  config: LibraryNavModulesConfig;
  onChange: (next: LibraryNavModulesConfig) => void;
}

export function LibraryNavModulesSection({ config, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function toggle(id: LibraryNavModuleId, enabled: boolean) {
    onChange({
      ...config,
      enabled: { ...config.enabled, [id]: enabled },
    });
  }

  function commitReorder(fromIndex: number, toIndex: number) {
    onChange(reorderLibraryNavModules(config, fromIndex, toIndex));
  }

  return (
    <section
      className="org-settings-group org-settings-library-nav-section is-active-section"
      data-settings-section="library-modules"
    >
      <h2 className="org-settings-group-title">Library navigation</h2>
      <p className="org-settings-brand-help">
        Drag to reorder sections and toggle visibility for all coaches. At least
        one section must stay visible. Saved with Apply.
      </p>
      <div className="admin-library-nav-modules">
        {config.order.map((id, index) => {
          const tab = LIBRARY_NAV_TABS.find((row) => row.id === id);
          return (
          <div
            key={id}
            className={`admin-library-nav-module-row${
              dragIndex === index ? " is-dragging" : ""
            }${dropIndex === index ? " is-drop-target" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) {
                setDropIndex(index);
              }
            }}
            onDragLeave={() => {
              if (dropIndex === index) setDropIndex(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const from = dragIndex;
              setDragIndex(null);
              setDropIndex(null);
              if (from == null || from === index) return;
              commitReorder(from, index);
            }}
          >
            <button
              type="button"
              className="admin-library-nav-module-drag"
              draggable
              aria-label={`Reorder ${LIBRARY_NAV_MODULE_LABELS[id]}`}
              title="Drag to reorder"
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              ⠿
            </button>
            <label className="admin-library-nav-module-toggle">
              <input
                type="checkbox"
                checked={config.enabled[id]}
                onChange={(event) => toggle(id, event.target.checked)}
              />
              <span className="admin-library-nav-module-label">
                {tab?.label ?? id.toUpperCase()}
              </span>
              <span className="admin-library-nav-module-hint">
                {LIBRARY_NAV_MODULE_LABELS[id]}
              </span>
            </label>
          </div>
          );
        })}
      </div>
    </section>
  );
}
