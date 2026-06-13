const STORAGE_KEY = "fastcourt_library_review_v1";

export type LibraryReviewStatus =
  | "ok"
  | "redraw"
  | "category"
  | "team"
  | "pending";

export interface LibraryReviewRecord {
  playId: string;
  status: LibraryReviewStatus;
  note: string;
  reviewedAt: string;
}

export interface LibraryReviewQueue {
  all: string[];
  pending: string[];
  reviewedCount: number;
}

function loadAll(): Record<string, LibraryReviewRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LibraryReviewRecord>;
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, LibraryReviewRecord>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getLibraryReviewRecord(
  playId: string | undefined,
): LibraryReviewRecord | null {
  if (!playId) return null;
  return loadAll()[playId] ?? null;
}

export function setLibraryReviewRecord(
  playId: string,
  status: LibraryReviewStatus,
  note = "",
) {
  const all = loadAll();
  all[playId] = {
    playId,
    status,
    note: note.trim(),
    reviewedAt: new Date().toISOString(),
  };
  saveAll(all);
}

export function resetLibraryReviewRecords() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getLibraryReviewQueue(playIds: string[]): LibraryReviewQueue {
  const all = loadAll();
  const pending = playIds.filter((id) => !all[id] || all[id].status === "pending");
  return {
    all: playIds,
    pending,
    reviewedCount: playIds.length - pending.length,
  };
}

export function summarizeReviewCounts(playIds: string[]) {
  const all = loadAll();
  let statusRedraw = 0;
  let statusCategory = 0;
  let statusOk = 0;
  for (const id of playIds) {
    const s = all[id]?.status;
    if (s === "redraw") statusRedraw++;
    else if (s === "category") statusCategory++;
    else if (s === "ok") statusOk++;
  }
  return { statusRedraw, statusCategory, statusOk };
}
