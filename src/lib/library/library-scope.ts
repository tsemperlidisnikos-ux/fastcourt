import {
  clearLibraryDbScope,
  getLibraryDbScopeId,
  setLibraryDbScopeId,
} from "@/lib/library/idb-scope";
import { resetLibraryDbConnection } from "@/lib/library/idb";
import type { SessionUser } from "@/types/auth";

let activeSessionUserId: string | null = null;
let activeLibraryOwnerUserId: string | null = null;
let activeSessionUser: SessionUser | null = null;

export function getActiveSessionUserId(): string | null {
  return activeSessionUserId;
}

export function getActiveLibraryOwnerUserId(): string | null {
  return activeLibraryOwnerUserId;
}

export function getActiveSessionUser(): SessionUser | null {
  return activeSessionUser;
}

export function isLibraryScopeReady(): boolean {
  return !!getLibraryDbScopeId();
}

/** Restore in-memory library scope from the active session (survives page refresh). */
export async function ensureLibraryScopeReady(): Promise<boolean> {
  if (isLibraryScopeReady()) return true;

  const { waitForActiveLibrarySync, prepareLibrarySessionForUser } =
    await import("@/lib/cloud/library-sync");
  await waitForActiveLibrarySync();
  if (isLibraryScopeReady()) return true;

  const { useAuthStore } = await import("@/stores/auth-store");
  const session = useAuthStore.getState().session;
  if (!session?.user) return false;

  await prepareLibrarySessionForUser(session.user);
  return isLibraryScopeReady();
}

export function activateLibraryScope(
  sessionUserId: string,
  libraryOwnerUserId: string,
  sessionUser?: SessionUser | null,
): boolean {
  const scopeChanged = getLibraryDbScopeId() !== libraryOwnerUserId;
  if (scopeChanged) {
    resetLibraryDbConnection();
  }
  setLibraryDbScopeId(libraryOwnerUserId);
  activeSessionUserId = sessionUserId;
  activeLibraryOwnerUserId = libraryOwnerUserId;
  if (sessionUser?.id === sessionUserId) {
    activeSessionUser = sessionUser;
  } else if (activeSessionUser?.id !== sessionUserId) {
    activeSessionUser = null;
  }
  return scopeChanged;
}

export function deactivateLibraryScope(): void {
  activeSessionUserId = null;
  activeLibraryOwnerUserId = null;
  activeSessionUser = null;
  clearLibraryDbScope();
  resetLibraryDbConnection();
}
