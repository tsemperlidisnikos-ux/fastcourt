import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { StoredPlay } from "@/types/library";

const DB_NAME = "fastcourt_library_v1";
const DB_VERSION = 1;

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

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

export function getLibraryDb() {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<FastCourtLibraryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const plays = db.createObjectStore("plays", { keyPath: "id" });
        plays.createIndex("by-updated", "updatedAt");
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
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

export async function getMetaFlag(key: string): Promise<boolean> {
  const db = await getLibraryDb();
  const row = await db.get("meta", key);
  return row?.value === "1";
}

export async function setMetaFlag(key: string, on: boolean): Promise<void> {
  const db = await getLibraryDb();
  await db.put("meta", { key, value: on ? "1" : "0" });
}
