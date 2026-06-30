import { getMetaJson, setMetaJson } from "@/lib/library/meta";
import type {
  LibraryTombstone,
  LibraryTombstoneKind,
} from "@/lib/cloud/library-tombstone-types";

const TOMBSTONES_KEY = "library_tombstones_v1";

export async function getLibraryTombstones(): Promise<LibraryTombstone[]> {
  const rows = await getMetaJson<LibraryTombstone[]>(TOMBSTONES_KEY, []);
  return Array.isArray(rows) ? rows.filter(isValidTombstone) : [];
}

export async function setLibraryTombstones(
  tombstones: LibraryTombstone[],
): Promise<void> {
  await setMetaJson(TOMBSTONES_KEY, tombstones.filter(isValidTombstone));
}

export async function recordLibraryDeletion(
  id: string,
  kind: LibraryTombstoneKind,
): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) return;
  const deletedAt = new Date().toISOString();
  const tombstones = await getLibraryTombstones();
  const next = tombstones.filter((t) => !(t.id === trimmed && t.kind === kind));
  next.push({ id: trimmed, kind, deletedAt });
  await setLibraryTombstones(next);
}

function isValidTombstone(value: unknown): value is LibraryTombstone {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LibraryTombstone>;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    (row.kind === "play" || row.kind === "playbook" || row.kind === "practice" || row.kind === "gameplan" || row.kind === "homework") &&
    typeof row.deletedAt === "string" &&
    row.deletedAt.length > 0
  );
}
