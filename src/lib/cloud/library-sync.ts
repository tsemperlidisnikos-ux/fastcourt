import {
  applyLocalOrganizerMeta,
  gatherLocalOrganizerMeta,
} from "@/lib/cloud/library-meta-local";
import {
  fetchAllCloudUserLibraries,
  fetchCloudUserLibraries,
  fetchCloudUserLibrary,
  saveCloudUserLibrary,
} from "@/lib/cloud/library-cloud";
import {
  isPlatformAdminLibraryViewer,
  linkOrgCoachesToTeamLibrary,
  localTeamLibraryOwnerId,
  resolveLibraryCloudUserId,
  resolveOrgCoachProfileIds,
  syncTeamLibraryLink,
} from "@/lib/cloud/library-owner";
import { EMPTY_ORGANIZER_META } from "@/lib/cloud/library-meta-types";
import { mergeOrganizerMeta } from "@/lib/cloud/merge-meta";
import { mergePlaysByUpdatedAt, playsSyncable } from "@/lib/cloud/merge-plays";
import {
  filterByTombstones,
  mergeLibraryTombstones,
} from "@/lib/cloud/merge-tombstones";
import {
  findOrganizationMembership,
  organizationGrantsAppAccess,
} from "@/lib/auth/org-access";
import { loadAdminUsers } from "@/lib/auth/admin-users";
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
  listStoredPlaysForScope,
  replaceAllStoredPlays,
} from "@/lib/library/idb";
import { mergePrivateLocalPlaysIntoSharedLibrary } from "@/lib/library/local-team-library-merge";
import { activateLibraryScope, deactivateLibraryScope, getActiveLibraryOwnerUserId, getActiveSessionUserId } from "@/lib/library/library-scope";
import {
  filterPlaysForLibraryScope,
  filterPlaysForOrganization,
  playOwnedBySessionUser,
  usesPersonalPlayOwnership,
} from "@/lib/library/play-ownership";
import {
  getLibraryTombstones,
  setLibraryTombstones,
} from "@/lib/library/tombstones";
import { ROLES } from "@/lib/config";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";
import type { SupabaseClient } from "@supabase/supabase-js";

const LIBRARY_SYNC_AT_KEY = "fastcourt_library_cloud_synced_at";
const LEGACY_LIBRARY_PURGED_KEY = "fastcourt_legacy_library_purged_v1";

let activeLibrarySync: Promise<void> | null = null;
/** Serializes all library syncs (login, debounce, manual) so they cannot overlap. */
let librarySyncTail: Promise<void> = Promise.resolve();

export function waitForActiveLibrarySync(): Promise<void> {
  return librarySyncTail;
}

async function withLibrarySyncLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = librarySyncTail;
  librarySyncTail = previous.then(
    () => gate,
    () => gate,
  );
  activeLibrarySync = librarySyncTail;
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (activeLibrarySync === librarySyncTail) {
      activeLibrarySync = null;
    }
  }
}

/**
 * Never upsert a cloud row that would wipe or silently drop remote plays
 * that are still alive (not tombstoned). Re-unions missing remote plays.
 */
function protectCloudPlaysBeforeSave(
  playsToSave: StoredPlay[],
  remotePlays: StoredPlay[],
  tombstones: Awaited<ReturnType<typeof mergeLibraryTombstones>>,
  label: string,
): StoredPlay[] {
  const remoteAlive = filterByTombstones(
    remotePlays.filter(playsSyncable),
    "play",
    tombstones,
  );
  if (!remoteAlive.length) return playsToSave;

  if (!playsToSave.length) {
    console.warn(
      `FastCourt: refused empty ${label} cloud save; kept ${remoteAlive.length} remote play(s)`,
    );
    return remoteAlive;
  }

  const saveIds = new Set(playsToSave.map((play) => play.id));
  const missingRemote = remoteAlive.filter((play) => !saveIds.has(play.id));
  if (!missingRemote.length) return playsToSave;

  console.warn(
    `FastCourt: re-merged ${missingRemote.length} remote play(s) dropped before ${label} cloud save`,
  );
  return mergePlaysByUpdatedAt(playsToSave, missingRemote);
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

function mergeSnapshotPlays(
  base: StoredPlay[],
  snapshots: Map<string, { plays: StoredPlay[] }>,
): StoredPlay[] {
  let merged = base;
  for (const snapshot of snapshots.values()) {
    const plays = snapshot.plays.filter(playsSyncable);
    if (plays.length) {
      merged = mergePlaysByUpdatedAt(merged, plays);
    }
  }
  return merged;
}

async function mergeLocalScopesIntoActive(
  scopeIds: string[],
): Promise<StoredPlay[]> {
  let merged = await listStoredPlays();
  for (const scopeId of scopeIds) {
    if (!scopeId) continue;
    try {
      const plays = await listStoredPlaysForScope(scopeId);
      if (plays.length) {
        merged = mergePlaysByUpdatedAt(merged, plays.filter(playsSyncable));
      }
    } catch {
      // scope may not exist yet
    }
  }
  return merged;
}

async function collectPlatformAdminLocalScopeIds(
  adminUserId: string,
): Promise<string[]> {
  const ids = new Set<string>();
  for (const row of loadAdminUsers()) {
    if (row.id && row.id !== adminUserId) ids.add(row.id);
    if (row.email) ids.add(localTeamLibraryOwnerId(row.email));
  }
  return [...ids];
}

async function collectTeamAdminLocalCoachScopeIds(
  user: SessionUser,
): Promise<string[]> {
  const membership = findOrganizationMembership(user.email);
  if (!membership || membership.memberRole !== "team_admin") return [];
  const ids: string[] = [];
  for (const coach of membership.org.coaches) {
    if (coach.status === "disabled") continue;
    ids.push(localTeamLibraryOwnerId(coach.email));
  }
  return ids;
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
    const libraryOwnerUserId = await resolveLibraryCloudUserId(user, {
      supabase: null,
    });
    const scopeChanged = activateLibraryScope(
      user.id,
      libraryOwnerUserId,
      user,
    );
    const sessionChanged = shouldResetLibraryCache(
      prevSessionUserId,
      prevOwnerUserId,
      user.id,
      libraryOwnerUserId,
    );
    if (scopeChanged || sessionChanged) {
      await resetLibraryStoreState();
    }

    // Local org coaches share the team admin IndexedDB — migrate private plays once.
    if (libraryOwnerUserId !== user.id) {
      try {
        await mergePrivateLocalPlaysIntoSharedLibrary(
          user.id,
          libraryOwnerUserId,
          user,
        );
      } catch (err) {
        console.warn("FastCourt: local team library merge failed", err);
      }
    }

    // Team admin / platform admin: pull teammate private scopes into the shared view.
    try {
      if (isPlatformAdminLibraryViewer(user)) {
        const scopes = await collectPlatformAdminLocalScopeIds(user.id);
        const merged = await mergeLocalScopesIntoActive(scopes);
        await replaceAllStoredPlays(merged);
      } else {
        const membership = findOrganizationMembership(user.email);
        if (
          membership &&
          organizationGrantsAppAccess(membership) &&
          membership.memberRole === "team_admin"
        ) {
          const scopes = await collectTeamAdminLocalCoachScopeIds(user);
          const merged = await mergeLocalScopesIntoActive(scopes);
          await replaceAllStoredPlays(merged);
        }
      }
    } catch (err) {
      console.warn("FastCourt: local library aggregation failed", err);
    }

    return {
      libraryOwnerUserId,
      scopeChanged: scopeChanged || sessionChanged,
    };
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
    // Never wipe an org shared library when switching between team members.
    if (
      libraryOwnerUserId === user.id &&
      shouldClearUntrustedLocalLibrary(prevSessionUserId, user.id, localAll.length)
    ) {
      await clearLocalLibraryCache();
    }
  } catch {
    /* scope not ready yet */
  }

  // Org coaches: copy private IndexedDB plays into the shared team scope.
  if (libraryOwnerUserId !== user.id) {
    try {
      await mergePrivateLocalPlaysIntoSharedLibrary(
        user.id,
        libraryOwnerUserId,
        user,
      );
    } catch (err) {
      console.warn("FastCourt: team library merge failed", err);
    }
  }

  return { libraryOwnerUserId, scopeChanged: scopeChanged || sessionChanged };
}

export async function syncLibraryForUser(
  user: SessionUser,
): Promise<{ ok: true; result: LibrarySyncResult } | { ok: false; error: string }> {
  return withLibrarySyncLock(() => syncLibraryForUserUnlocked(user));
}

async function syncLibraryForUserUnlocked(
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
  let remoteMeta = snapshot.organizerMeta;
  let remoteTombstones = snapshot.tombstones;

  if (libraryOwnerUserId !== user.id) {
    const personalRemote = await fetchCloudUserLibrary(supabase, user.id);
    if (personalRemote.ok && personalRemote.snapshot.plays.length > 0) {
      remotePlays = mergePlaysByUpdatedAt(
        remotePlays,
        personalRemote.snapshot.plays.filter(playsSyncable),
      );
      remoteMeta = mergeOrganizerMeta(
        remoteMeta,
        personalRemote.snapshot.organizerMeta,
      );
      remoteTombstones = mergeLibraryTombstones(
        remoteTombstones,
        personalRemote.snapshot.tombstones,
      );
    }
  }

  // Team admin: fold every invited/active coach personal library into the shared row.
  const membership = findOrganizationMembership(user.email);
  const isTeamAdminViewer =
    (membership &&
      organizationGrantsAppAccess(membership) &&
      membership.memberRole === "team_admin") ||
    user.orgMemberRole === "team_admin" ||
    user.role === ROLES.teamAdmin;

  if (isTeamAdminViewer) {
    let coachIds: string[] = [];

    if (membership && organizationGrantsAppAccess(membership)) {
      // Link coach profiles → this admin so RLS can read their personal libraries.
      await linkOrgCoachesToTeamLibrary(supabase, membership.org);

      coachIds = await resolveOrgCoachProfileIds(
        membership.org,
        supabase,
        user.id,
      );
    } else {
      // Org roster missing in this browser — still merge already-linked coaches.
      const { data: linkedIds } = await supabase.rpc("list_team_linked_member_ids");
      if (Array.isArray(linkedIds)) {
        coachIds = linkedIds.filter(
          (id): id is string => typeof id === "string" && id !== user.id,
        );
      }
    }

    // Always include local private scopes for roster coaches (same browser).
    try {
      const localScopes = [
        ...(await collectTeamAdminLocalCoachScopeIds(user)),
        ...coachIds,
      ];
      const localMerged = await mergeLocalScopesIntoActive(localScopes);
      if (localMerged.length) {
        remotePlays = mergePlaysByUpdatedAt(
          remotePlays,
          localMerged.filter(playsSyncable),
        );
      }
    } catch (err) {
      console.warn("FastCourt: team admin local coach merge failed", err);
    }

    if (coachIds.length) {
      const coachLibs = await fetchCloudUserLibraries(supabase, coachIds);
      if (coachLibs.ok) {
        remotePlays = mergeSnapshotPlays(remotePlays, coachLibs.snapshots);
        for (const snap of coachLibs.snapshots.values()) {
          remoteMeta = mergeOrganizerMeta(remoteMeta, snap.organizerMeta);
          remoteTombstones = mergeLibraryTombstones(
            remoteTombstones,
            snap.tombstones,
          );
        }
      }
    }
  }

  // Platform admin: aggregate every accessible cloud library.
  if (isPlatformAdminLibraryViewer(user)) {
    const allLibs = await fetchAllCloudUserLibraries(supabase);
    if (allLibs.ok) {
      remotePlays = mergeSnapshotPlays(remotePlays, allLibs.snapshots);
      for (const snap of allLibs.snapshots.values()) {
        remoteMeta = mergeOrganizerMeta(remoteMeta, snap.organizerMeta);
        remoteTombstones = mergeLibraryTombstones(
          remoteTombstones,
          snap.tombstones,
        );
      }
    }
  }

  remotePlays = scopePlaysForUser(remotePlays, user, libraryOwnerUserId);
  let mergedTombstones = mergeLibraryTombstones(localTombstones, remoteTombstones);

  let mergedPlays = mergePlaysForUser(
    user,
    libraryOwnerUserId,
    localPlays,
    remotePlays,
    mergedTombstones,
  );

  if (usesPersonalPlayOwnership(user, libraryOwnerUserId)) {
    mergedPlays = mergedPlays.filter((play) => playOwnedBySessionUser(play, user));
  } else if (
    membership &&
    organizationGrantsAppAccess(membership) &&
    (membership.memberRole === "team_admin" ||
      membership.memberRole === "coach")
  ) {
    // Never keep platform-admin / outsider plays in the team shared library.
    mergedPlays = filterPlaysForOrganization(mergedPlays, membership.org);
  }

  const mergedMetaRaw = mergeOrganizerMeta(localMeta, remoteMeta);
  let mergedMeta = {
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
    remoteMeta.playbooks,
  );
  const practiceSides = countMergedFromSides(
    mergedMeta.practice.sessions,
    localMeta.practice.sessions,
    remoteMeta.practice.sessions,
  );

  await replaceAllStoredPlays(mergedPlays);
  await applyLocalOrganizerMeta(mergedMeta);
  await setLibraryTombstones(mergedTombstones);

  // Platform admin keeps a full local view but must not write other users'
  // plays into the admin cloud row (and never unstamped foreign plays).
  let playsToSave = isPlatformAdminLibraryViewer(user)
    ? mergedPlays.filter((play) => playOwnedBySessionUser(play, user))
    : mergedPlays;

  // Never wipe the admin cloud row if a bad merge produced zero owned plays
  // while the remote row still has admin-owned content.
  if (
    isPlatformAdminLibraryViewer(user) &&
    playsToSave.length === 0 &&
    remotePlays.some((play) => playOwnedBySessionUser(play, user))
  ) {
    playsToSave = remotePlays.filter((play) =>
      playOwnedBySessionUser(play, user),
    );
    console.warn(
      "FastCourt: refused empty platform-admin cloud save; kept remote owned plays",
    );
  }

  // Shared / coach libraries: refuse empty or filter-shrunk upserts.
  if (!isPlatformAdminLibraryViewer(user)) {
    playsToSave = protectCloudPlaysBeforeSave(
      playsToSave,
      remotePlays,
      mergedTombstones,
      libraryOwnerUserId === user.id ? "personal" : "team",
    );
  }

  // If another client wrote while we merged, fold their newer row in before upsert.
  const latestRemote = await fetchCloudUserLibrary(supabase, libraryOwnerUserId);
  if (
    latestRemote.ok &&
    latestRemote.snapshot.updatedAt &&
    snapshot.updatedAt &&
    latestRemote.snapshot.updatedAt !== snapshot.updatedAt
  ) {
    const latestPlays = latestRemote.snapshot.plays.filter(playsSyncable);
    mergedTombstones = mergeLibraryTombstones(
      mergedTombstones,
      latestRemote.snapshot.tombstones,
    );
    playsToSave = mergePlaysByUpdatedAt(playsToSave, latestPlays);
    playsToSave = filterByTombstones(playsToSave, "play", mergedTombstones);
    if (!isPlatformAdminLibraryViewer(user)) {
      playsToSave = protectCloudPlaysBeforeSave(
        playsToSave,
        latestPlays,
        mergedTombstones,
        "concurrent",
      );
    } else {
      playsToSave = playsToSave.filter((play) =>
        playOwnedBySessionUser(play, user),
      );
    }
    mergedMeta = mergeOrganizerMeta(
      mergedMeta,
      latestRemote.snapshot.organizerMeta,
    );
    console.warn(
      "FastCourt: cloud library changed during sync; re-merged before save",
    );
  }

  const saveResult = await saveCloudUserLibrary(
    supabase,
    libraryOwnerUserId,
    playsToSave,
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
  try {
    const result = await syncLibraryForUser(user);
    if (!result.ok) {
      console.warn("FastCourt library auto-sync:", result.error);
    }
  } catch (err) {
    console.error("FastCourt library auto-sync failed:", err);
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
