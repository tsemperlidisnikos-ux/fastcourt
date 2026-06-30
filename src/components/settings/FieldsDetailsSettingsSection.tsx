"use client";

import { useState } from "react";
import { appConfirm, appNotice, appPrompt } from "@/stores/dialog-store";
import { clearFieldCategory } from "@/lib/settings/clear-field-categories";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { DefaultFieldsConfig } from "@/types/default-fields";

type FieldCategory = keyof DefaultFieldsConfig;

const CATEGORIES: {
  key: FieldCategory;
  label: string;
  singular: string;
  placeholder: string;
}[] = [
  {
    key: "seasons",
    label: "Seasons",
    singular: "season",
    placeholder: "e.g. 2025-26",
  },
  {
    key: "series",
    label: "Series",
    singular: "series",
    placeholder: "e.g. Horns",
  },
  {
    key: "tags",
    label: "Tags",
    singular: "tag",
    placeholder: "e.g. Motion",
  },
];

function normalizeName(name: string) {
  return name.trim();
}

function parseFieldEntries(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const name = normalizeName(part);
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(name);
  }
  return out;
}

function appendUniqueValues(existing: string[], incoming: string[]) {
  const seen = new Set(existing.map((value) => value.toLowerCase()));
  const added: string[] = [];
  const skipped: string[] = [];
  for (const name of incoming) {
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      skipped.push(name);
      continue;
    }
    seen.add(lower);
    added.push(name);
  }
  return {
    next: [...existing, ...added],
    added,
    skipped,
  };
}

function reorderValues(values: string[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= values.length ||
    toIndex >= values.length ||
    fromIndex === toIndex
  ) {
    return values;
  }
  const next = [...values];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return values;
  next.splice(toIndex, 0, moved);
  return next;
}

function CategoryColumn({
  categoryKey,
  label,
  singular,
  placeholder,
  values,
  config,
  onChange,
  onCleared,
}: {
  categoryKey: FieldCategory;
  label: string;
  singular: string;
  placeholder: string;
  values: string[];
  config: DefaultFieldsConfig;
  onChange: (next: DefaultFieldsConfig) => void;
  onCleared?: (next: DefaultFieldsConfig) => void;
}) {
  const loadOrganizerMeta = useOrganizerStore((s) => s.loadMeta);
  const [busy, setBusy] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  async function handleAdd() {
    const raw = await appPrompt({
      title: `Add ${label.toLowerCase()}`,
      subtitle: `Enter one or many ${label.toLowerCase()}, separated by comma or new line.`,
      label: `${label} names`,
      placeholder: `e.g. ${placeholder.replace("e.g. ", "")}, Motion, PNR`,
      submitLabel: "Add",
      multiline: true,
    });
    if (raw === null) return;
    const entries = parseFieldEntries(raw);
    if (!entries.length) {
      appNotice("Missing names", `Enter at least one ${singular} name.`);
      return;
    }
    const { next, added, skipped } = appendUniqueValues(values, entries);
    if (!added.length) {
      appNotice(
        "Already exists",
        skipped.length === 1
          ? `"${skipped[0]}" already exists.`
          : "All entered values already exist.",
      );
      return;
    }
    onChange({ ...config, [categoryKey]: next });
    if (skipped.length) {
      appNotice(
        "Added",
        `Added ${added.length} ${label.toLowerCase()}. Skipped ${skipped.length} duplicate(s).`,
      );
    }
  }

  async function handleClearAll() {
    if (!values.length) return;
    const confirmed = await appConfirm({
      title: `Clear all ${label.toLowerCase()}`,
      message: `Remove all ${label.toLowerCase()} from Fields and admin defaults?`,
      confirmLabel: "Clear all",
      danger: true,
    });
    if (!confirmed) return;

    setClearing(true);
    try {
      const next = await clearFieldCategory(categoryKey, config);
      await loadOrganizerMeta();
      onChange(next);
      onCleared?.(next);
      appNotice("Cleared", `All ${label.toLowerCase()} entries were removed.`);
    } finally {
      setClearing(false);
    }
  }

  async function handleEdit(currentName: string) {
    if (busy) return;
    setBusy(true);
    try {
      const nextName = await appPrompt({
        title: `Edit ${singular}`,
        subtitle: `Rename this default ${singular}.`,
        label: `${label.slice(0, -1)} name`,
        initialValue: currentName,
        placeholder,
        submitLabel: "Save",
      });
      if (nextName === null) return;
      const trimmed = normalizeName(nextName);
      if (!trimmed) {
        appNotice("Missing name", `Enter a ${singular} name.`);
        return;
      }
      if (trimmed.toLowerCase() === currentName.toLowerCase()) return;
      if (
        values.some(
          (value) =>
            value.toLowerCase() === trimmed.toLowerCase() &&
            value.toLowerCase() !== currentName.toLowerCase(),
        )
      ) {
        appNotice("Already exists", `That ${singular} already exists.`);
        return;
      }
      onChange({
        ...config,
        [categoryKey]: values.map((value) =>
          value.toLowerCase() === currentName.toLowerCase() ? trimmed : value,
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(name: string) {
    const confirmed = await appConfirm({
      title: `Delete ${singular}`,
      message: `Delete "${name}" from default ${label.toLowerCase()}?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    onChange({
      ...config,
      [categoryKey]: values.filter((value) => value !== name),
    });
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    onChange({
      ...config,
      [categoryKey]: reorderValues(values, fromIndex, toIndex),
    });
  }

  return (
    <div className="org-settings-fields-column">
      <div className="org-settings-fields-column-head">
        <div className="org-settings-fields-category-title">{label}</div>
        <div className="org-settings-fields-column-actions">
          <button
            type="button"
            className="org-settings-fields-action-btn is-add"
            onClick={() => void handleAdd()}
          >
            Add
          </button>
          <button
            type="button"
            className="org-settings-fields-action-btn is-clear-all"
            onClick={() => void handleClearAll()}
            disabled={clearing || !values.length}
          >
            {clearing ? "Clearing…" : "Clear all entries"}
          </button>
        </div>
      </div>
      <ul className="org-settings-fields-list">
        {!values.length ? (
          <li className="org-settings-fields-empty">No {label.toLowerCase()} yet.</li>
        ) : (
          values.map((value, index) => (
            <li
              key={value}
              className={`org-settings-fields-item${dragIndex === index ? " is-dragging" : ""}${dropTargetIndex === index && dragIndex !== index ? " is-drag-over" : ""}`}
              draggable
              onDragStart={(e) => {
                if (
                  (e.target as HTMLElement).closest(
                    ".org-settings-fields-item-actions",
                  )
                ) {
                  e.preventDefault();
                  return;
                }
                setDragIndex(index);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex != null && dragIndex !== index) {
                  handleReorder(dragIndex, index);
                }
                setDragIndex(null);
                setDropTargetIndex(null);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropTargetIndex(null);
              }}
            >
              <span
                className="org-settings-fields-item-drag"
                title="Drag to reorder"
                aria-hidden="true"
              >
                ⠿
              </span>
              <span className="org-settings-fields-item-label">{value}</span>
              <div className="org-settings-fields-item-actions">
                <button
                  type="button"
                  className="org-settings-fields-action-btn"
                  onClick={() => void handleEdit(value)}
                  aria-label={`Edit ${value}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="org-settings-fields-action-btn is-delete"
                  onClick={() => void handleDelete(value)}
                  aria-label={`Delete ${value}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function FieldsDetailsSettingsSection({
  config,
  onChange,
  onCleared,
}: {
  config: DefaultFieldsConfig;
  onChange: (next: DefaultFieldsConfig) => void;
  onCleared?: (next: DefaultFieldsConfig) => void;
}) {
  return (
    <section
      className="org-settings-group org-settings-fields-details-section is-active-section"
      data-settings-section="fields-details"
    >
      <div className="org-settings-group-title">Fields details</div>
      <p className="org-settings-brand-help">
        Set the default Seasons, Series, and Tags available across the app. These
        entries are protected: users can use them but cannot rename or delete them
        from the Fields tab. Drag a row to reorder within each column. Use Add,
        Edit, or Delete, then click Apply to save.
      </p>
      <div className="org-settings-fields-columns">
        {CATEGORIES.map((category) => (
          <CategoryColumn
            key={category.key}
            categoryKey={category.key}
            label={category.label}
            singular={category.singular}
            placeholder={category.placeholder}
            values={config[category.key]}
            config={config}
            onChange={onChange}
            onCleared={onCleared}
          />
        ))}
      </div>
    </section>
  );
}
