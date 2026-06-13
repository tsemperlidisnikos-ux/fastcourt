import type { LibraryItem } from "@/types/library";

export const LIBRARY_SORT_STORAGE_KEY = "fastcourt_library_sort_v1";

export const LIBRARY_SORT_OPTIONS = [
  { id: "name-asc", label: "Name A–Z", field: "name" as const, dir: "asc" as const },
  { id: "name-desc", label: "Name Z–A", field: "name" as const, dir: "desc" as const },
  { id: "series-asc", label: "Series A–Z", field: "series" as const, dir: "asc" as const },
  { id: "team-asc", label: "Team A–Z", field: "team" as const, dir: "asc" as const },
  { id: "season-asc", label: "Season A–Z", field: "season" as const, dir: "asc" as const },
] as const;

export type LibrarySortId = (typeof LIBRARY_SORT_OPTIONS)[number]["id"];

export function loadLibrarySortId(): LibrarySortId {
  if (typeof window === "undefined") return "name-asc";
  try {
    const saved = sessionStorage.getItem(LIBRARY_SORT_STORAGE_KEY);
    if (saved && LIBRARY_SORT_OPTIONS.some((opt) => opt.id === saved)) {
      return saved as LibrarySortId;
    }
  } catch {
    /* ignore */
  }
  return "name-asc";
}

export function saveLibrarySortId(sortId: LibrarySortId) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LIBRARY_SORT_STORAGE_KEY, sortId);
  } catch {
    /* ignore */
  }
}

export function getLibrarySortOption(sortId: LibrarySortId) {
  return LIBRARY_SORT_OPTIONS.find((opt) => opt.id === sortId) ?? LIBRARY_SORT_OPTIONS[0];
}

function compareAlpha(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function compareLibraryItems(
  a: LibraryItem,
  b: LibraryItem,
  sortId: LibrarySortId,
  pinFavoritesFirst: boolean,
) {
  if (pinFavoritesFirst) {
    const pinCmp = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
    if (pinCmp !== 0) return pinCmp;
  }

  const mode = getLibrarySortOption(sortId);
  let cmp = 0;
  switch (mode.field) {
    case "series":
      cmp = compareAlpha(a.series || "", b.series || "");
      break;
    case "team":
      cmp = compareAlpha(a.team || "", b.team || "");
      break;
    case "season":
      cmp = compareAlpha(a.season || "", b.season || "");
      break;
    default:
      cmp = compareAlpha(a.title || "", b.title || "");
  }
  if (cmp === 0) cmp = compareAlpha(a.title || "", b.title || "");
  return mode.dir === "desc" ? -cmp : cmp;
}
