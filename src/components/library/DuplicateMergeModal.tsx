"use client";

import type { LibraryItem } from "@/types/library";

interface DuplicateGroup {
  titleKey: string;
  items: LibraryItem[];
}

interface Props {
  open: boolean;
  groups: DuplicateGroup[];
  onClose: () => void;
  onMerge: (keeperId: string, removeIds: string[]) => void;
}

export function DuplicateMergeModal({ open, groups, onClose, onMerge }: Props) {
  if (!open) return null;

  return (
    <div className="fc-dup-merge-modal" id="duplicate-merge-modal" role="dialog" aria-modal="true">
      <div className="fc-dup-merge-box">
        <h3 className="fc-dup-merge-title">Review duplicates</h3>
        <p className="fc-dup-merge-copy">
          Pick which play to keep in each group. Others will be deleted.
        </p>
        <div className="fc-dup-merge-groups">
          {groups.map((group) => (
            <DuplicateGroupRow
              key={group.titleKey}
              group={group}
              onMerge={onMerge}
            />
          ))}
        </div>
        <div className="fc-dup-merge-footer">
          <button type="button" className="library-clean-btn-small" id="duplicate-merge-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DuplicateGroupRow({
  group,
  onMerge,
}: {
  group: DuplicateGroup;
  onMerge: (keeperId: string, removeIds: string[]) => void;
}) {
  const title = group.items[0]?.title ?? group.titleKey;

  return (
    <div className="fc-dup-merge-group">
      <div className="fc-dup-merge-group-title">{title}</div>
      <ul className="fc-dup-merge-list">
        {group.items.map((item, index) => (
          <li key={item.id}>
            <span>
              {item.team || "No Team"} · {item.frameCount} frame(s) ·{" "}
              {new Date(item.updatedAt).toLocaleDateString()}
            </span>
            <button
              type="button"
              className="library-clean-btn-small"
              onClick={() => {
                const removeIds = group.items
                  .filter((i) => i.id !== item.id)
                  .map((i) => i.id);
                onMerge(item.id, removeIds);
              }}
            >
              {index === 0 ? "Keep this" : "Keep instead"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function findDuplicateGroups(items: LibraryItem[]): DuplicateGroup[] {
  const map = new Map<string, LibraryItem[]>();
  for (const item of items) {
    const key = item.title.trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([titleKey, list]) => ({ titleKey, items: list }));
}
