import {
  listStoredPlays,
  listStoredPlaysForScope,
  replaceAllStoredPlays,
} from "@/lib/library/idb";
import { stampPlayOwner } from "@/lib/library/play-ownership";
import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";

function isBrowser() {
  return typeof window !== "undefined";
}

function preferNewer(a: StoredPlay, b: StoredPlay): StoredPlay {
  const aTime = new Date(a.updatedAt).getTime();
  const bTime = new Date(b.updatedAt).getTime();
  return aTime >= bTime ? a : b;
}

/**
 * Copy a coach's private local plays into the shared team library.
 * Idempotent: merges missing / newer plays on each login.
 */
export async function mergePrivateLocalPlaysIntoSharedLibrary(
  privateScopeId: string,
  sharedScopeId: string,
  user: SessionUser,
): Promise<{ merged: number }> {
  if (!isBrowser()) return { merged: 0 };
  if (!privateScopeId || !sharedScopeId || privateScopeId === sharedScopeId) {
    return { merged: 0 };
  }

  const privatePlays = await listStoredPlaysForScope(privateScopeId);
  if (!privatePlays.length) return { merged: 0 };

  const sharedPlays = await listStoredPlays();
  const byId = new Map<string, StoredPlay>();
  for (const play of sharedPlays) {
    byId.set(play.id, play);
  }

  let merged = 0;
  for (const play of privatePlays) {
    const stamped = stampPlayOwner(play, user);
    const existing = byId.get(stamped.id);
    if (!existing) {
      byId.set(stamped.id, stamped);
      merged += 1;
      continue;
    }
    const next = preferNewer(stamped, existing);
    if (next !== existing) {
      byId.set(stamped.id, next);
      merged += 1;
    }
  }

  if (merged > 0) {
    await replaceAllStoredPlays([...byId.values()]);
  }

  return { merged };
}
