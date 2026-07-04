import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  getLibraryDbScopeId,
  libraryDbNameForScope,
} from "@/lib/library/idb-scope";
import type { FilmRoomSession } from "@/types/film-room";
import { normalizeFilmRoomSession } from "@/lib/film-room/film-room-session";

const DB_VERSION = 1;

interface FilmRoomDB extends DBSchema {
  sessions: {
    key: string;
    value: FilmRoomSession;
    indexes: { "by-updated": number };
  };
  blobs: {
    key: string;
    value: { id: string; blob: Blob; fileName: string; mimeType?: string };
  };
}

let dbPromise: Promise<IDBPDatabase<FilmRoomDB>> | null = null;
let boundScopeId: string | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function filmRoomDbName(scopeId: string) {
  return `fastcourt_film_room_${libraryDbNameForScope(scopeId).replace("fastcourt_library_", "")}`;
}

export function resetFilmRoomDbConnection() {
  dbPromise = null;
  boundScopeId = null;
}

async function getFilmRoomDb(): Promise<IDBPDatabase<FilmRoomDB>> {
  if (!isBrowser()) {
    throw new Error("IndexedDB is only available in the browser.");
  }

  const { ensureLibraryScopeReady } = await import("@/lib/library/library-scope");
  const ready = await ensureLibraryScopeReady();
  if (!ready) {
    throw new Error("Library scope is not set. Sign in again.");
  }

  const scopeId = getLibraryDbScopeId();
  if (!scopeId) {
    throw new Error("Library scope is not set. Sign in again.");
  }

  if (!dbPromise || boundScopeId !== scopeId) {
    boundScopeId = scopeId;
    dbPromise = openDB<FilmRoomDB>(filmRoomDbName(scopeId), DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sessions")) {
          const sessions = db.createObjectStore("sessions", { keyPath: "id" });
          sessions.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("blobs")) {
          db.createObjectStore("blobs", { keyPath: "id" });
        }
      },
    });
  }

  return dbPromise;
}

export async function listFilmRoomSessions(): Promise<FilmRoomSession[]> {
  const db = await getFilmRoomDb();
  const rows = await db.getAllFromIndex("sessions", "by-updated");
  return rows.map(normalizeFilmRoomSession).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getFilmRoomSession(
  id: string,
): Promise<FilmRoomSession | undefined> {
  const db = await getFilmRoomDb();
  return db.get("sessions", id);
}

export async function putFilmRoomSession(session: FilmRoomSession) {
  const db = await getFilmRoomDb();
  await db.put("sessions", session);
}

export async function deleteFilmRoomSession(id: string) {
  const db = await getFilmRoomDb();
  const session = await db.get("sessions", id);
  await db.delete("sessions", id);
  if (session?.source.kind === "upload") {
    await db.delete("blobs", session.source.blobId);
  }
}

export async function putFilmRoomBlob(
  id: string,
  blob: Blob,
  fileName: string,
  mimeType?: string,
) {
  const db = await getFilmRoomDb();
  await db.put("blobs", { id, blob, fileName, mimeType });
}

export async function getFilmRoomBlob(id: string) {
  const db = await getFilmRoomDb();
  const row = await db.get("blobs", id);
  return row?.blob;
}
