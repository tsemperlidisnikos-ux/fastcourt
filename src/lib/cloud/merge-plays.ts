import type { StoredPlay } from "@/types/library";

/** Merge by play id — keep the copy with the latest updatedAt. */
export function mergePlaysByUpdatedAt(
  local: StoredPlay[],
  remote: StoredPlay[],
): StoredPlay[] {
  const byId = new Map<string, StoredPlay>();
  for (const play of remote) {
    if (play?.id) byId.set(play.id, play);
  }
  for (const play of local) {
    if (!play?.id) continue;
    const existing = byId.get(play.id);
    if (!existing || play.updatedAt >= existing.updatedAt) {
      byId.set(play.id, play);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function playsSyncable(play: StoredPlay): boolean {
  return !play.lazyPending;
}
