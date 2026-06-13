import {
  getLibraryReviewRecord,
  summarizeReviewCounts,
} from "@/lib/library/library-review";
import type { LibraryItem } from "@/types/library";

export type LibraryCleanFilter =
  | "off"
  | "duplicates"
  | "no-team"
  | "empty"
  | "lazy"
  | "unassigned"
  | "misc"
  | "status-redraw"
  | "status-category"
  | "status-ok";

export interface LibraryCleanSummary {
  total: number;
  duplicates: number;
  duplicateGroups: number;
  noTeam: number;
  empty: number;
  lazy: number;
  unassigned: number;
  misc: number;
  statusRedraw: number;
  statusCategory: number;
  statusOk: number;
}

function normTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function isDuplicate(item: LibraryItem, all: LibraryItem[]) {
  const key = normTitle(item.title);
  if (!key) return false;
  return all.filter((p) => normTitle(p.title) === key).length > 1;
}

function isNoTeam(item: LibraryItem) {
  const team = (item.team || "").trim();
  return !team || team.toLowerCase() === "no team";
}

function isEmpty(item: LibraryItem) {
  return item.frameCount <= 0;
}

function isLazy(item: LibraryItem) {
  return item.source === "fdb-import" && item.frameCount <= 1;
}

function isUnassigned(item: LibraryItem, assignedIds: Set<string>) {
  return !assignedIds.has(item.id);
}

function isMisc(item: LibraryItem) {
  const tags = item.tags.map((t) => t.toLowerCase());
  return tags.includes("misc") || tags.includes("miscellaneous");
}

export function summarizeLibraryClean(
  items: LibraryItem[],
  assignedPlayIds: Set<string>,
): LibraryCleanSummary {
  const groups = new Map<string, number>();
  for (const item of items) {
    const key = normTitle(item.title);
    if (!key) continue;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  const duplicateGroups = [...groups.values()].filter((n) => n > 1).length;
  const review = summarizeReviewCounts(items.map((i) => i.id));

  return {
    total: items.length,
    duplicates: items.filter((i) => isDuplicate(i, items)).length,
    duplicateGroups,
    noTeam: items.filter(isNoTeam).length,
    empty: items.filter(isEmpty).length,
    lazy: items.filter(isLazy).length,
    unassigned: items.filter((i) => isUnassigned(i, assignedPlayIds)).length,
    misc: items.filter(isMisc).length,
    statusRedraw: review.statusRedraw,
    statusCategory: review.statusCategory,
    statusOk: review.statusOk,
  };
}

export function matchesLibraryCleanFilter(
  item: LibraryItem,
  filter: LibraryCleanFilter,
  all: LibraryItem[],
  assignedPlayIds: Set<string>,
): boolean {
  if (filter === "off") return true;
  if (filter === "duplicates") return isDuplicate(item, all);
  if (filter === "no-team") return isNoTeam(item);
  if (filter === "empty") return isEmpty(item);
  if (filter === "lazy") return isLazy(item);
  if (filter === "unassigned") return isUnassigned(item, assignedPlayIds);
  if (filter === "misc") return isMisc(item);
  if (filter === "status-redraw") {
    return getLibraryReviewRecord(item.id)?.status === "redraw";
  }
  if (filter === "status-category") {
    return getLibraryReviewRecord(item.id)?.status === "category";
  }
  if (filter === "status-ok") {
    return getLibraryReviewRecord(item.id)?.status === "ok";
  }
  return true;
}
