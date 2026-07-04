import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  getLibraryDbScopeId,
  libraryDbNameForScope,
} from "@/lib/library/idb-scope";
import type { StoredPlay } from "@/types/library";

const DB_VERSION = 1;
/** Legacy DB name from pre-scope builds; purged on cloud login via library-sync. */
const LEGACY_DB_NAME = "fastcourt_library_v1";

interface FastCourtLibraryDB extends DBSchema {
  plays: {
    key: string;
    value: StoredPlay;
    indexes: { "by-updated": string };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

let dbPromise: Promise<IDBPDatabase<FastCourtLibraryDB>> | null = null;
let boundScopeId: string | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function resetLibraryDbConnection(): void {
  dbPromise = null;
  boundScopeId = null;
}

function openLibraryDatabase(dbName: string) {
  return openDB<FastCourtLibraryDB>(dbName, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("plays")) {
        const plays = db.createObjectStore("plays", { keyPath: "id" });
        plays.createIndex("by-updated", "updatedAt");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
}

function openLibraryDbForScope(): Promise<IDBPDatabase<FastCourtLibraryDB>> {
  const scopeId = getLibraryDbScopeId();
  if (!scopeId) {
    throw new Error("Library scope is not set. Sign in again.");
  }

  if (!dbPromise || boundScopeId !== scopeId) {
    boundScopeId = scopeId;
    dbPromise = openLibraryDatabase(libraryDbNameForScope(scopeId));
  }

  return dbPromise;
}

export async function getLibraryDb(): Promise<IDBPDatabase<FastCourtLibraryDB>> {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser.");
  }

  const { ensureLibraryScopeReady } = await import("@/lib/library/library-scope");
  const ready = await ensureLibraryScopeReady();
  if (!ready) {
    throw new Error("Library scope is not set. Sign in again.");
  }

  return openLibraryDbForScope();
}

/** Drop the legacy shared database that leaked plays across accounts on one browser. */
export async function deleteLegacySharedLibraryDb(): Promise<void> {
  if (!isBrowser()) return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

export async function listStoredPlays(): Promise<StoredPlay[]> {
  const db = await getLibraryDb();
  const items = await db.getAll("plays");
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function getStoredPlay(id: string): Promise<StoredPlay | undefined> {
  const db = await getLibraryDb();
  return db.get("plays", id);
}

export async function putStoredPlay(play: StoredPlay): Promise<void> {
  const db = await getLibraryDb();
  await db.put("plays", play);
}

export async function putStoredPlays(plays: StoredPlay[]): Promise<void> {
  const db = await getLibraryDb();
  const tx = db.transaction("plays", "readwrite");
  await Promise.all([...plays.map((p) => tx.store.put(p)), tx.done]);
}

export async function deleteStoredPlay(id: string): Promise<void> {
  const db = await getLibraryDb();
  await db.delete("plays", id);
}

export async function replaceAllStoredPlays(plays: StoredPlay[]): Promise<void> {
  const db = await getLibraryDb();
  const tx = db.transaction("plays", "readwrite");
  await tx.store.clear();
  for (const play of plays) {
    await tx.store.put(play);
  }
  await tx.done;
}

export async function getMetaFlag(key: string): Promise<boolean> {
  const db = await getLibraryDb();
  const row = await db.get("meta", key);
  return row?.value === "1";
}

export async function setMetaFlag(key: string, on: boolean): Promise<void> {
  const db = await getLibraryDb();
  await db.put("meta", { key, value: on ? "1" : "0" });
}
