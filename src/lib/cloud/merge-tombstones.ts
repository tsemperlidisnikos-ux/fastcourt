import type {
  LibraryTombstone,
  LibraryTombstoneKind,
} from "@/lib/cloud/library-tombstone-types";

export function mergeLibraryTombstones(
  local: LibraryTombstone[],
  remote: LibraryTombstone[],
): LibraryTombstone[] {
  const byKey = new Map<string, LibraryTombstone>();
  const keyOf = (t: LibraryTombstone) => `${t.kind}:${t.id}`;
  for (const tombstone of remote) {
    if (!tombstone?.id || !tombstone.deletedAt) continue;
    byKey.set(keyOf(tombstone), tombstone);
  }
  for (const tombstone of local) {
    if (!tombstone?.id || !tombstone.deletedAt) continue;
    const key = keyOf(tombstone);
    const existing = byKey.get(key);
    if (!existing || tombstone.deletedAt >= existing.deletedAt) {
      byKey.set(key, tombstone);
    }
  }
  return [...byKey.values()];
}

export function isLibraryItemTombstoned(
  id: string,
  kind: LibraryTombstoneKind,
  updatedAt: string,
  tombstones: LibraryTombstone[],
): boolean {
  const tombstone = tombstones.find((t) => t.id === id && t.kind === kind);
  if (!tombstone) return false;
  return tombstone.deletedAt >= updatedAt;
}

export function filterByTombstones<T extends { id: string; updatedAt: string }>(
  items: T[],
  kind: LibraryTombstoneKind,
  tombstones: LibraryTombstone[],
): T[] {
  return items.filter(
    (item) => !isLibraryItemTombstoned(item.id, kind, item.updatedAt, tombstones),
  );
}
