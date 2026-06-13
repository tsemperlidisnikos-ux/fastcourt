import { listStoredPlays, putStoredPlays } from "@/lib/library/idb";
import type { StoredPlay } from "@/types/library";

export interface LibraryExportPayload {
  type: "fastcourt_library_export";
  version: 1;
  exportedAt: string;
  plays: StoredPlay[];
}

export interface UserBackupPayload {
  type: "fastcourt_user_backup";
  version: 1;
  exportedAt: string;
  plays: StoredPlay[];
}

const BACKUP_HISTORY_KEY = "fastcourt_backup_history_v1";
const SAFETY_SNAPSHOT_KEY = "fastcourt_safety_snapshot_v1";

function isBrowser() {
  return typeof window !== "undefined";
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportLibraryJson() {
  const plays = await listStoredPlays();
  const payload: LibraryExportPayload = {
    type: "fastcourt_library_export",
    version: 1,
    exportedAt: new Date().toISOString(),
    plays,
  };
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`FastCourt_Library_${date}.json`, payload);
  return payload;
}

export async function importLibraryPayload(payload: unknown): Promise<number> {
  let plays: StoredPlay[] = [];
  if (
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    (payload as { type: string }).type === "fastcourt_library_export" &&
    Array.isArray((payload as LibraryExportPayload).plays)
  ) {
    plays = (payload as LibraryExportPayload).plays;
  } else if (
    payload &&
    typeof payload === "object" &&
    "type" in payload &&
    (payload as { type: string }).type === "fastcourt_user_backup" &&
    Array.isArray((payload as UserBackupPayload).plays)
  ) {
    plays = (payload as UserBackupPayload).plays;
  } else if (Array.isArray(payload)) {
    plays = payload as StoredPlay[];
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { plays?: StoredPlay[] }).plays)
  ) {
    plays = (payload as { plays: StoredPlay[] }).plays;
  } else {
    throw new Error("Unrecognized backup format.");
  }

  if (!plays.length) return 0;
  await putStoredPlays(plays);
  return plays.length;
}

export function readBackupHistory(): UserBackupPayload[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserBackupPayload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createManualBackup(): Promise<UserBackupPayload> {
  const plays = await listStoredPlays();
  const payload: UserBackupPayload = {
    type: "fastcourt_user_backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    plays,
  };
  const history = readBackupHistory();
  history.unshift(payload);
  localStorage.setItem(
    BACKUP_HISTORY_KEY,
    JSON.stringify(history.slice(0, 3)),
  );
  return payload;
}

export async function createSafetySnapshot() {
  const payload = await createManualBackup();
  localStorage.setItem(SAFETY_SNAPSHOT_KEY, JSON.stringify(payload));
  return payload;
}

export async function restoreSafetySnapshot() {
  if (!isBrowser()) return 0;
  const raw = localStorage.getItem(SAFETY_SNAPSHOT_KEY);
  if (!raw) throw new Error("No safety snapshot found.");
  return importLibraryPayload(JSON.parse(raw));
}

export async function restoreLatestBackup() {
  const history = readBackupHistory();
  if (!history.length) throw new Error("No backups in history.");
  return importLibraryPayload(history[0]);
}
