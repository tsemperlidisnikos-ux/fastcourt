import type { SupabaseClient } from "@supabase/supabase-js";
import type { CloudOrganizerMeta } from "@/lib/cloud/library-meta-types";
import { EMPTY_ORGANIZER_META } from "@/lib/cloud/library-meta-types";
import type { LibraryTombstone } from "@/lib/cloud/library-tombstone-types";
import type { StoredPlay } from "@/types/library";

export interface UserLibraryRow {
  user_id: string;
  plays: StoredPlay[] | null;
  organizer_meta: CloudOrganizerMeta | null;
  library_tombstones: LibraryTombstone[] | null;
  updated_at: string;
}

function normalizeOrganizerMeta(raw: unknown): CloudOrganizerMeta {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ORGANIZER_META };
  const meta = raw as Partial<CloudOrganizerMeta>;
  return {
    seasons: Array.isArray(meta.seasons) ? meta.seasons : EMPTY_ORGANIZER_META.seasons,
    teams: Array.isArray(meta.teams) ? meta.teams : EMPTY_ORGANIZER_META.teams,
    series: Array.isArray(meta.series) ? meta.series : [],
    fieldTags: Array.isArray(meta.fieldTags) ? meta.fieldTags : [],
    playbooks: Array.isArray(meta.playbooks) ? meta.playbooks : [],
    practice: {
      sessions: Array.isArray(meta.practice?.sessions) ? meta.practice!.sessions : [],
    },
    gamePlans: Array.isArray(meta.gamePlans) ? meta.gamePlans : [],
    playerHomework: Array.isArray(meta.playerHomework) ? meta.playerHomework : [],
  };
}

function normalizeTombstones(raw: unknown): LibraryTombstone[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (row): row is LibraryTombstone =>
      !!row &&
      typeof row === "object" &&
      typeof (row as LibraryTombstone).id === "string" &&
      ((row as LibraryTombstone).kind === "play" ||
        (row as LibraryTombstone).kind === "playbook" ||
        (row as LibraryTombstone).kind === "practice" ||
        (row as LibraryTombstone).kind === "gameplan" ||
        (row as LibraryTombstone).kind === "homework") &&
      typeof (row as LibraryTombstone).deletedAt === "string",
  );
}

export interface CloudUserLibrarySnapshot {
  plays: StoredPlay[];
  organizerMeta: CloudOrganizerMeta;
  tombstones: LibraryTombstone[];
  updatedAt: string | null;
}

const EMPTY_SNAPSHOT: CloudUserLibrarySnapshot = {
  plays: [],
  organizerMeta: { ...EMPTY_ORGANIZER_META },
  tombstones: [],
  updatedAt: null,
};

export async function fetchCloudUserLibrary(
  supabase: SupabaseClient,
  userId: string,
): Promise<
  { ok: true; snapshot: CloudUserLibrarySnapshot } | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("user_library")
    .select("user_id, plays, organizer_meta, library_tombstones, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (/user_library/i.test(error.message) && /does not exist/i.test(error.message)) {
      return { ok: true, snapshot: { ...EMPTY_SNAPSHOT } };
    }
    if (/library_tombstones|organizer_meta/i.test(error.message) && /does not exist/i.test(error.message)) {
      const legacy = await supabase
        .from("user_library")
        .select("user_id, plays, organizer_meta, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (legacy.error) return { ok: false, error: legacy.error.message };
      const row = legacy.data as UserLibraryRow | null;
      return {
        ok: true,
        snapshot: {
          plays: Array.isArray(row?.plays) ? row.plays : [],
          organizerMeta: normalizeOrganizerMeta(row?.organizer_meta),
          tombstones: [],
          updatedAt: row?.updated_at ?? null,
        },
      };
    }
    return { ok: false, error: error.message };
  }

  if (!data) return { ok: true, snapshot: { ...EMPTY_SNAPSHOT } };

  const row = data as UserLibraryRow;
  return {
    ok: true,
    snapshot: {
      plays: Array.isArray(row.plays) ? row.plays : [],
      organizerMeta: normalizeOrganizerMeta(row.organizer_meta),
      tombstones: normalizeTombstones(row.library_tombstones),
      updatedAt: row.updated_at ?? null,
    },
  };
}

function rowToSnapshot(row: UserLibraryRow): CloudUserLibrarySnapshot {
  return {
    plays: Array.isArray(row.plays) ? row.plays : [],
    organizerMeta: normalizeOrganizerMeta(row.organizer_meta),
    tombstones: normalizeTombstones(row.library_tombstones),
    updatedAt: row.updated_at ?? null,
  };
}

/** Fetch several user_library rows (team admin → coaches). */
export async function fetchCloudUserLibraries(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<
  | { ok: true; snapshots: Map<string, CloudUserLibrarySnapshot> }
  | { ok: false; error: string }
> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const snapshots = new Map<string, CloudUserLibrarySnapshot>();
  if (!unique.length) return { ok: true, snapshots };

  const { data, error } = await supabase
    .from("user_library")
    .select("user_id, plays, organizer_meta, library_tombstones, updated_at")
    .in("user_id", unique);

  if (error) {
    if (/user_library/i.test(error.message) && /does not exist/i.test(error.message)) {
      return { ok: true, snapshots };
    }
    for (const id of unique) {
      const one = await fetchCloudUserLibrary(supabase, id);
      if (one.ok) snapshots.set(id, one.snapshot);
    }
    return { ok: true, snapshots };
  }

  for (const row of (data ?? []) as UserLibraryRow[]) {
    snapshots.set(row.user_id, rowToSnapshot(row));
  }
  return { ok: true, snapshots };
}

/** Platform admin: every library row visible under RLS. */
export async function fetchAllCloudUserLibraries(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; snapshots: Map<string, CloudUserLibrarySnapshot> }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("user_library")
    .select("user_id, plays, organizer_meta, library_tombstones, updated_at");

  if (error) {
    return { ok: false, error: error.message };
  }

  const snapshots = new Map<string, CloudUserLibrarySnapshot>();
  for (const row of (data ?? []) as UserLibraryRow[]) {
    snapshots.set(row.user_id, rowToSnapshot(row));
  }
  return { ok: true, snapshots };
}

export async function saveCloudUserLibrary(
  supabase: SupabaseClient,
  userId: string,
  plays: StoredPlay[],
  organizerMeta: CloudOrganizerMeta,
  tombstones: LibraryTombstone[],
): Promise<{ ok: true; updatedAt: string } | { ok: false; error: string }> {
  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("user_library").upsert(
    {
      user_id: userId,
      plays,
      organizer_meta: organizerMeta,
      library_tombstones: tombstones,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (/library_tombstones/i.test(error.message) && /does not exist/i.test(error.message)) {
      const legacy = await supabase.from("user_library").upsert(
        {
          user_id: userId,
          plays,
          organizer_meta: organizerMeta,
          updated_at: updatedAt,
        },
        { onConflict: "user_id" },
      );
      if (legacy.error) return { ok: false, error: legacy.error.message };
      return { ok: true, updatedAt };
    }
    if (/organizer_meta/i.test(error.message) && /does not exist/i.test(error.message)) {
      const legacy = await supabase.from("user_library").upsert(
        { user_id: userId, plays, updated_at: updatedAt },
        { onConflict: "user_id" },
      );
      if (legacy.error) return { ok: false, error: legacy.error.message };
      return { ok: true, updatedAt };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, updatedAt };
}
