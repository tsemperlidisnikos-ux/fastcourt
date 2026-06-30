"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { FC_CONTEXT_MENU_TRIGGER_ATTR } from "@/lib/ui/context-menu-policy";
import {
  FieldContextMenu,
  type FieldContextMenuState,
} from "@/components/library/FieldContextMenu";
import { clearAllFieldCategoryEntries } from "@/lib/settings/clear-field-categories";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  isProtectedDefaultField,
  type ProtectedFieldTab,
} from "@/lib/settings/default-fields";
import {
  appConfirm,
  appNotice,
  appPrompt,
} from "@/stores/dialog-store";
import type { FieldsSubTab } from "@/types/library-meta";

const SUBTABS: { id: FieldsSubTab; label: string }[] = [
  { id: "seasons", label: "Seasons" },
  { id: "teams", label: "Teams" },
  { id: "series", label: "Series" },
  { id: "tags", label: "Tags" },
];

const CREATE_LABEL: Record<FieldsSubTab, string> = {
  seasons: "SEASON",
  teams: "TEAM",
  series: "SERIES",
  tags: "TAG",
};

const NAME_COL: Record<FieldsSubTab, string> = {
  seasons: "Season",
  teams: "Team",
  series: "Series",
  tags: "Tag",
};

function isProtectedField(tab: FieldsSubTab, name: string) {
  if (tab === "teams") return false;
  return isProtectedDefaultField(tab as ProtectedFieldTab, name);
}

export function FieldsView() {
  const [tab, setTab] = useState<FieldsSubTab>("seasons");
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<FieldContextMenuState | null>(null);

  const seasons = useOrganizerStore((s) => s.seasons);
  const teams = useOrganizerStore((s) => s.teams);
  const series = useOrganizerStore((s) => s.series);
  const fieldTags = useOrganizerStore((s) => s.fieldTags);
  const countPlaysForField = useOrganizerStore((s) => s.countPlaysForField);
  const addField = useOrganizerStore((s) => s.addField);
  const renameField = useOrganizerStore((s) => s.renameField);
  const deleteFields = useOrganizerStore((s) => s.deleteFields);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);

  useEffect(() => {
    const flag = "fc_fields_wiped_v2";
    if (typeof window === "undefined" || localStorage.getItem(flag)) return;
    void (async () => {
      await clearAllFieldCategoryEntries();
      await loadMeta();
      localStorage.setItem(flag, "1");
    })();
  }, [loadMeta]);

  const rows = useMemo(() => {
    const list =
      tab === "seasons"
        ? seasons
        : tab === "teams"
          ? teams
          : tab === "series"
            ? series
            : fieldTags;
    const q = query.trim().toLowerCase();
    return list
      .filter((name) => !q || name.toLowerCase().includes(q))
      .map((name) => ({
        name,
        count: countPlaysForField(tab, name),
      }));
  }, [tab, seasons, teams, series, fieldTags, query, countPlaysForField]);

  async function handleCreate(name: string) {
    const ok = await addField(tab, name);
    if (!ok) {
      appNotice("Already exists", `A ${NAME_COL[tab].toLowerCase()} with that name already exists.`);
      return;
    }
  }

  async function handleOpenCreate() {
    const fieldLabel = NAME_COL[tab];
    const fieldLabelLower = fieldLabel.toLowerCase();
    const name = await appPrompt({
      title: `Create ${fieldLabelLower}`,
      subtitle: `Add a new ${fieldLabelLower} to use when organizing plays.`,
      label: `${fieldLabel} name`,
      placeholder: `Enter ${fieldLabelLower} name…`,
      submitLabel: `Create ${fieldLabelLower}`,
    });
    if (name === null) return;
    await handleCreate(name);
  }

  async function handleOpenRename(fieldName: string) {
    if (isProtectedField(tab, fieldName)) {
      appNotice(
        "Default field",
        "This is an admin default and cannot be renamed.",
      );
      return;
    }
    const fieldLabel = NAME_COL[tab];
    const fieldLabelLower = fieldLabel.toLowerCase();
    const nextName = await appPrompt({
      title: `Rename ${fieldLabelLower}`,
      subtitle: `Update this ${fieldLabelLower} and linked plays.`,
      label: `${fieldLabel} name`,
      initialValue: fieldName,
      placeholder: `Enter ${fieldLabelLower} name…`,
      submitLabel: "Rename",
    });
    if (nextName === null) return;
    const ok = await renameField(tab, fieldName, nextName);
    if (!ok) {
      appNotice(
        "Rename failed",
        `Could not rename this ${fieldLabelLower}. The name may already exist.`,
      );
      return;
    }
    if (selectedName?.toLowerCase() === fieldName.toLowerCase()) {
      setSelectedName(nextName.trim());
    }
  }

  async function handleOpenDelete(fieldName: string) {
    if (isProtectedField(tab, fieldName)) {
      appNotice(
        "Default field",
        "This is an admin default and cannot be deleted.",
      );
      return;
    }
    const fieldLabelLower = NAME_COL[tab].toLowerCase();
    const confirmed = await appConfirm({
      title: `Delete ${fieldLabelLower}`,
      message: `Delete "${fieldName}"? Plays keep their data; only this ${fieldLabelLower} entry is removed from the list.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    const ok = await deleteFields(tab, [fieldName]);
    if (!ok) {
      appNotice(
        "Default field",
        "This is an admin default and cannot be deleted.",
      );
      return;
    }
    if (selectedName?.toLowerCase() === fieldName.toLowerCase()) {
      setSelectedName(null);
    }
  }

  function handleRowContextMenu(fieldName: string, e: MouseEvent<HTMLTableRowElement>) {
    e.preventDefault();
    setSelectedName(fieldName);
    setContextMenu({ x: e.clientX, y: e.clientY, fieldName });
  }

  return (
    <>
      <div className="fc-fields-shell" id="fc-fields-shell">
        <div className="fc-fields-toolbar fc-organizer-section-toolbar">
          <nav className="fc-fields-subtabs" aria-label="Field types">
            {SUBTABS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`fc-fields-subtab${tab === s.id ? " active" : ""}`}
                data-fields-tab={s.id}
                onClick={() => {
                  setTab(s.id);
                  setQuery("");
                  setSelectedName(null);
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <div className="fc-fields-actions">
            <button
              type="button"
              className="fc-organizer-create-btn"
              id="btn-fields-create"
              onClick={() => void handleOpenCreate()}
            >
              ADD {CREATE_LABEL[tab]}
            </button>
          </div>
        </div>
        <div className="fc-fields-card">
          <div className="fc-fields-search-row">
            <span className="fd-search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              type="search"
              className="fc-fields-search-input"
              id="fields-search-input"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="fc-fields-table-wrap">
            <table className="fc-fields-table">
              <thead>
                <tr>
                  <th className="fc-fields-col-name" id="fields-table-name-col">
                    {NAME_COL[tab]}
                  </th>
                  <th className="fc-fields-col-count"># of Plays</th>
                </tr>
              </thead>
              <tbody id="fields-table-body">
                {!rows.length ? (
                  <tr className="fc-fields-empty-row">
                    <td colSpan={2}>No matches</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.name}
                      className={`fc-fields-row${selectedName === row.name ? " selected" : ""}`}
                      data-fields-name={row.name}
                      {...{ [FC_CONTEXT_MENU_TRIGGER_ATTR]: "" }}
                      onClick={() => setSelectedName(row.name)}
                      onContextMenu={(e) => handleRowContextMenu(row.name, e)}
                    >
                      <td className="fc-fields-col-name">{row.name}</td>
                      <td className="fc-fields-col-count">{row.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {contextMenu ? (
        <FieldContextMenu
          menu={contextMenu}
          fieldLabel={NAME_COL[tab]}
          canRename={!isProtectedField(tab, contextMenu.fieldName)}
          canDelete={!isProtectedField(tab, contextMenu.fieldName)}
          onClose={() => setContextMenu(null)}
          onRename={() => void handleOpenRename(contextMenu.fieldName)}
          onDelete={() => void handleOpenDelete(contextMenu.fieldName)}
        />
      ) : null}
    </>
  );
}
