import {
  applyLocalOrganizerMeta,
  gatherLocalOrganizerMeta,
} from "@/lib/cloud/library-meta-local";
import {
  fetchCloudUserLibrary,
  saveCloudUserLibrary,
} from "@/lib/cloud/library-cloud";
import { resolveLibraryCloudUserId, syncTeamLibraryLink } from "@/lib/cloud/library-owner";
import { EMPTY_ORGANIZER_META } from "@/lib/cloud/library-meta-types";
import { mergeOrganizerMeta } from "@/lib/cloud/merge-meta";
import { mergePlaysByUpdatedAt, playsSyncable } from "@/lib/cloud/merge-plays";
import {
  filterByTombstones,
  mergeLibraryTombstones,
} from "@/lib/cloud/merge-tombstones";
import {
  clearLocalLibraryCache,
  prepareLibraryCacheForUser,
  setCloudLibrarySession,
  setLibraryCacheIds,
} from "@/lib/library/library-cache";
import {
  shouldClearUntrustedLocalLibrary,
  shouldResetLibraryCache,
} from "@/lib/library/library-cache-policy";
import {
  deleteLegacySharedLibraryDb,
  listStoredPlays,
  replaceAllStoredPlays,
} from "@/lib/library/idb";
import { activateLibraryScope, deactivateLibraryScope, getActiveLibraryOwnerUserId, getActiveSessionUserId } from "@/lib/library/library-scope";
import {
  filterPlaysForLibraryScope,
  playOwnedBySessionUser,
  usesPersonalPlayOwnership,
} from "@/lib/library/play-ownership";
import {
  getLibraryTombstones,
  setLibraryTombstones,
} from "@/lib/library/tombstones";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";
import type { SupabaseClient } from "@supabase/supabase-js";

const LIBRARY_SYNC_AT_KEY = "fastcourt_library_cloud_synced_at";
const LEGACY_LIBRARY_PURGED_KEY = "fastcourt_legacy_library_purged_v1";

let activeLibrarySync: Promise<void> | null = null;

export function waitForActiveLibrarySync(): Promise<void> {
  return activeLibrarySync ?? Promise.resolve();
}

function isCloudUser(user: SessionUser): boolean {
  return !user.id.startsWith("local-") && !user.id.startsWith("demo-");
}

function librarySyncKey(userId: string) {
  return `${LIBRARY_SYNC_AT_KEY}_${userId}`;
}

export function readLibraryCloudSyncedAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(librarySyncKey(userId));
  } catch {
    return null;
  }
}

function writeLibraryCloudSyncedAt(userId: string, iso: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(librarySyncKey(userId), iso);
  } catch {
    /* ignore */
  }
}

async function resetLibraryStoreState(): Promise<void> {
  const { useLibraryStore } = await import("@/stores/library-store");
  useLibraryStore.setState({
    items: [],
    loading: true,
    hydrated: false,
    error: null,
  });
}

async function refreshLibraryStores() {
  const { useLibraryStore } = await import("@/stores/library-store");
  const { useOrganizerStore } = await import("@/stores/organizer-store");
  useLibraryStore.setState({ hydrated: false });
  await useLibraryStore.getState().refresh();
  await useOrganizerStore.getState().loadMeta();
}

function countMergedFromSides<T extends { id: string; updatedAt: string }>(
  merged: T[],
  local: T[],
  remote: T[],
): { fromCloud: number; fromLocal: number } {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  let fromCloud = 0;
  let fromLocal = 0;
  for (const item of merged) {
    const localItem = localById.get(item.id);
    const remoteItem = remoteById.get(item.id);
    if (localItem && remoteItem) {
      if (item.updatedAt === localItem.updatedAt) fromLocal++;
      else fromCloud++;
    } else if (remoteItem) {
      fromCloud++;
    } else {
      fromLocal++;
    }
  }
  return { fromCloud, fromLocal };
}

function scopePlaysForUser(
  plays: StoredPlay[],
  user: SessionUser,
  libraryOwnerUserId: string,
): StoredPlay[] {
  return filterPlaysForLibraryScope(plays, user, libraryOwnerUserId);
}

async function ensureProfileOrganization(
  supabase: SupabaseClient,
  user: SessionUser,
): Promise<void> {
  await syncTeamLibraryLink(supabase, user);
}

export interface LibrarySyncResult {
  playCount: number;
  playbookCount: number;
  practiceCount: number;
  mergedFromCloud: number;
  mergedFromLocal: number;
  skippedLazy: number;
  syncedAt: string;
}

function mergePlaysForUser(
  user: SessionUser,
  libraryOwnerUserId: string,
  localPlays: StoredPlay[],
  remotePlays: StoredPlay[],
  tombstones: Awaited<ReturnType<typeof mergeLibraryTombstones>>,
): StoredPlay[] {
  const personal = usesPersonalPlayOwnership(user, libraryOwnerUserId);

  if (personal) {
    const ownedLocal = localPlays.filter((play) => playOwnedBySessionUser(play, user));
    const ownedRemote = remotePlays.filter((play) => playOwnedBySessionUser(play, user));
    return filterByTombstones(
      mergePlaysByUpdatedAt(ownedLocal, ownedRemote),
      "play",
      tombstones,
    );
  }

  return filterByTombstones(
    mergePlaysByUpdatedAt(localPlays, remotePlays),
    "play",
    tombstones,
  );
}

async function purgeLegacySharedLibraryOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LEGACY_LIBRARY_PURGED_KEY) === "1") return;
    await deleteLegacySharedLibraryDb();
    localStorage.setItem(LEGACY_LIBRARY_PURGED_KEY, "1");
  } catch (err) {
    console.warn("FastCourt: legacy library purge failed", err);
  }
}

export async function ensureLibraryReadyForUser(
  user: SessionUser,
  supabase?: SupabaseClient | null,
): Promise<void> {
  await prepareLibrarySessionForUser(user, supabase);
  await syncLibraryOnLogin(user);
}

/** Prepare local cache before session/library UI loads (clears stale browser data). */
export async function prepareLibrarySessionForUser(
  user: SessionUser,
  supabase?: SupabaseClient | null,
): Promise<{ libraryOwnerUserId: string; scopeChanged: boolean }> {
  const prevSessionUserId = getActiveSessionUserId();
  const prevOwnerUserId = getActiveLibraryOwnerUserId();

  if (!isCloudUser(user)) {
    const scopeChanged = activateLibraryScope(user.id, user.id, user);
    const sessionChanged = shouldResetLibraryCache(
      prevSessionUserId,
      prevOwnerUserId,
      user.id,
      user.id,
    );
    if (scopeChanged || sessionChanged) {
      await resetLibraryStoreState();
    }
    return { libraryOwnerUserId: user.id, scopeChanged: scopeChanged || sessionChanged };
  }

  await purgeLegacySharedLibraryOnce();
  setCloudLibrarySession(true);
  const client = supabase ?? createClient();
  const libraryOwnerUserId = await resolveLibraryCloudUserId(user, { supabase: client });
  if (client) {
    await ensureProfileOrganization(client, user);
  }
  const scopeChanged = prepareLibraryCacheForUser(user, libraryOwnerUserId);
  const sessionChanged = shouldResetLibraryCache(
    prevSessionUserId,
    prevOwnerUserId,
    user.id,
    libraryOwnerUserId,
  );

  if (scopeChanged || sessionChanged) {
    await resetLibraryStoreState();
  }

  try {
    const localAll = await listStoredPlays();
    if (
      shouldClearUntrustedLocalLibrary(prevSessionUserId, user.id, localAll.length)
    ) {
      await clearLocalLibraryCache();
    }
  } catch {
    /* scope not ready yet */
  }

  return { libraryOwnerUserId, scopeChanged: scopeChanged || sessionChanged };
}

export async function syncLibraryForUser(
  user: SessionUser,
): Promise<{ ok: true; result: LibrarySyncResult } | { ok: false; error: string }> {
  if (!isCloudEnabled() || !isCloudUser(user)) {
    return { ok: false, error: "Sign in with cloud mode to sync your library." };
  }

  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Cloud is not configured." };
  }

  const { libraryOwnerUserId } = await prepareLibrarySessionForUser(
    user,
    supabase,
  );

  void ensureProfileOrganization(supabase, user);

  const localAll = await listStoredPlays();
  let localPlays = localAll.filter(playsSyncable);
  localPlays = scopePlaysForUser(localPlays, user, libraryOwnerUserId);
  const skippedLazy = localAll.length - localPlays.length;
  const localMeta = await gatherLocalOrganizerMeta();
  const localTombstones = await getLibraryTombstones();

  const remoteResult = await fetchCloudUserLibrary(supabase, libraryOwnerUserId);
  if (!remoteResult.ok) return remoteResult;

  const { snapshot } = remoteResult;
  let remotePlays = snapshot.plays.filter(playsSyncable);

  if (libraryOwnerUserId !== user.id) {
    const personalRemote = await fetchCloudUserLibrary(supabase, user.id);
    if (personalRemote.ok && personalRemote.snapshot.plays.length > 0) {
      remotePlays = mergePlaysByUpdatedAt(
        remotePlays,
        personalRemote.snapshot.plays.filter(playsSyncable),
      );
    }
  }

  remotePlays = scopePlaysForUser(remotePlays, user, libraryOwnerUserId);
  const mergedTombstones = mergeLibraryTombstones(localTombstones, snapshot.tombstones);

  let mergedPlays = mergePlaysForUser(
    user,
    libraryOwnerUserId,
    localPlays,
    remotePlays,
    mergedTombstones,
  );

  if (usesPersonalPlayOwnership(user, libraryOwnerUserId)) {
    mergedPlays = mergedPlays.filter((play) => playOwnedBySessionUser(play, user));
  }

  const mergedMetaRaw = mergeOrganizerMeta(localMeta, snapshot.organizerMeta);
  const mergedMeta = {
    ...mergedMetaRaw,
    playbooks: filterByTombstones(mergedMetaRaw.playbooks, "playbook", mergedTombstones),
    practice: {
      sessions: filterByTombstones(
        mergedMetaRaw.practice.sessions,
        "practice",
        mergedTombstones,
      ),
    },
    gamePlans: filterByTombstones(mergedMetaRaw.gamePlans, "gameplan", mergedTombstones),
    playerHomework: filterByTombstones(
      mergedMetaRaw.playerHomework,
      "homework",
      mergedTombstones,
    ),
  };

  const playSides = countMergedFromSides(mergedPlays, localPlays, remotePlays);
  const playbookSides = countMergedFromSides(
    mergedMeta.playbooks,
    localMeta.playbooks,
    snapshot.organizerMeta.playbooks,
  );
  const practiceSides = countMergedFromSides(
    mergedMeta.practice.sessions,
    localMeta.practice.sessions,
    snapshot.organizerMeta.practice.sessions,
  );

  await replaceAllStoredPlays(mergedPlays);
  await applyLocalOrganizerMeta(mergedMeta);
  await setLibraryTombstones(mergedTombstones);

  const saveResult = await saveCloudUserLibrary(
    supabase,
    libraryOwnerUserId,
    mergedPlays,
    mergedMeta,
    mergedTombstones,
  );
  if (!saveResult.ok) return saveResult;

  await setLibraryCacheIds(user, libraryOwnerUserId);
  writeLibraryCloudSyncedAt(libraryOwnerUserId, saveResult.updatedAt);
  await refreshLibraryStores();

  return {
    ok: true,
    result: {
      playCount: mergedPlays.length,
      playbookCount: mergedMeta.playbooks.length,
      practiceCount: mergedMeta.practice.sessions.length,
      mergedFromCloud:
        playSides.fromCloud + playbookSides.fromCloud + practiceSides.fromCloud,
      mergedFromLocal:
        playSides.fromLocal + playbookSides.fromLocal + practiceSides.fromLocal,
      skippedLazy,
      syncedAt: saveResult.updatedAt,
    },
  };
}

/** Silent background sync — logs errors, never throws. */
export async function syncLibraryOnLogin(user: SessionUser): Promise<void> {
  const run = (async () => {
    try {
      const result = await syncLibraryForUser(user);
      if (!result.ok) {
        console.warn("FastCourt library auto-sync:", result.error);
      }
    } catch (err) {
      console.error("FastCourt library auto-sync failed:", err);
    }
  })();

  activeLibrarySync = run;
  try {
    await run;
  } finally {
    if (activeLibrarySync === run) activeLibrarySync = null;
  }
}

let pendingCloudSyncTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced cloud sync after local library edits (solo coach isolation). */
export function scheduleCloudLibrarySync(user?: SessionUser): void {
  if (typeof window === "undefined") return;
  if (pendingCloudSyncTimer) clearTimeout(pendingCloudSyncTimer);

  pendingCloudSyncTimer = setTimeout(() => {
    pendingCloudSyncTimer = null;
    void (async () => {
      const { useAuthStore } = await import("@/stores/auth-store");
      const sessionUser = user ?? useAuthStore.getState().session?.user;
      const session = useAuthStore.getState().session;
      if (!sessionUser || !session?.cloud) return;
      if (!isCloudUser(sessionUser)) return;
      await syncLibraryForUser(sessionUser);
    })();
  }, 1200);
}

/** Clear per-browser library cache when the signed-in user changes or on sign out. */
export async function resetLibraryOnSignOut(): Promise<void> {
  setCloudLibrarySession(false);
  deactivateLibraryScope();

  const { useLibraryStore } = await import("@/stores/library-store");
  useLibraryStore.setState({
    items: [],
    loading: false,
    hydrated: false,
    error: null,
  });

  const { useOrganizerStore } = await import("@/stores/organizer-store");
  useOrganizerStore.setState({
    plays: [],
    hydrated: false,
  });
}
