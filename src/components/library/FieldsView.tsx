"use client";

import { useMemo, useState } from "react";
import { useOrganizerStore } from "@/stores/organizer-store";
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

export function FieldsView() {
  const [tab, setTab] = useState<FieldsSubTab>("seasons");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const seasons = useOrganizerStore((s) => s.seasons);
  const teams = useOrganizerStore((s) => s.teams);
  const series = useOrganizerStore((s) => s.series);
  const fieldTags = useOrganizerStore((s) => s.fieldTags);
  const countPlaysForField = useOrganizerStore((s) => s.countPlaysForField);
  const addField = useOrganizerStore((s) => s.addField);
  const deleteFields = useOrganizerStore((s) => s.deleteFields);

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
      .map((name) => ({ name, count: countPlaysForField(tab, name) }));
  }, [tab, seasons, teams, series, fieldTags, query, countPlaysForField]);

  const selectedNames = useMemo(() => [...selected], [selected]);
  const deleteMessage = useMemo(() => {
    if (selectedNames.length === 1) {
      return `Delete "${selectedNames[0]}"? Plays keep their data; only this ${NAME_COL[tab].toLowerCase()} entry is removed from the list.`;
    }
    return `Delete ${selectedNames.length} ${NAME_COL[tab].toLowerCase()} entries? This cannot be undone.`;
  }, [selectedNames, tab]);

  function toggleRow(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCreate(name: string) {
    const ok = await addField(tab, name);
    if (!ok) {
      throw new Error("This item already exists.");
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

  async function handleOpenDelete() {
    if (!selected.size) {
      appNotice(
        "Nothing selected",
        "Select one or more items from the list first.",
      );
      return;
    }
    const fieldLabelLower = NAME_COL[tab].toLowerCase();
    const confirmed = await appConfirm({
      title: `Delete ${fieldLabelLower}`,
      message: deleteMessage,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await deleteFields(tab, selectedNames);
    setSelected(new Set());
  }

  return (
    <div className="fc-fields-shell" id="fc-fields-shell">
      <div className="fc-fields-toolbar">
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
                setSelected(new Set());
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="fc-fields-actions">
          <button
            type="button"
            className="fc-fields-create-btn fd-create-play-btn"
            id="btn-fields-create"
            onClick={() => void handleOpenCreate()}
          >
            + CREATE {CREATE_LABEL[tab]}
          </button>
          <button
            type="button"
            className="fc-fields-delete-btn fd-create-play-btn"
            id="btn-fields-delete"
            disabled={!selected.size}
            onClick={() => void handleOpenDelete()}
          >
            DELETE {CREATE_LABEL[tab]}
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
                <th className="fc-fields-col-check" scope="col">
                  <input
                    type="checkbox"
                    className="fc-fields-select-all"
                    id="fields-select-all"
                    aria-label="Select all"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelected(new Set(rows.map((r) => r.name)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                  />
                </th>
                <th className="fc-fields-col-name" id="fields-table-name-col">
                  {NAME_COL[tab]}
                </th>
                <th className="fc-fields-col-count"># of Plays</th>
              </tr>
            </thead>
            <tbody id="fields-table-body">
              {!rows.length ? (
                <tr className="fc-fields-empty-row">
                  <td colSpan={3}>No matches</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.name}
                    className={`fc-fields-row${selected.has(row.name) ? " selected" : ""}`}
                    data-fields-name={row.name}
                    onClick={() => toggleRow(row.name)}
                  >
                    <td className="fc-fields-col-check">
                      <input
                        type="checkbox"
                        className="fc-fields-row-check"
                        checked={selected.has(row.name)}
                        onChange={() => toggleRow(row.name)}
                        aria-label={`Select ${row.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
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
  );
}
