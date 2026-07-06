import { scheduleCloudLibrarySync } from "@/lib/cloud/library-sync";
import { deleteStoredPlay, getStoredPlay } from "@/lib/library/idb";
import { getPlaybookSections, setPlaybookSections } from "@/lib/library/meta";
import { recordLibraryDeletion } from "@/lib/library/tombstones";

/** Retired built-in demo plays — removed from all libraries. */
export const STARTER_DEMO_PLAY_IDS = [
  "play-ice-sideline-force",
  "play-switch-all-spain",
] as const;

export async function removeStarterDemoPlays() {
  const ids = new Set<string>(STARTER_DEMO_PLAY_IDS);
  let changed = false;

  for (const id of STARTER_DEMO_PLAY_IDS) {
    const play = await getStoredPlay(id);
    if (!play) continue;
    await deleteStoredPlay(id);
    await recordLibraryDeletion(id, "play");
    changed = true;
  }

  const playbooks = await getPlaybookSections();
  let playbooksChanged = false;
  const nextPlaybooks = playbooks.map((section) => {
    const playRefs = section.playRefs.filter((ref) => !ids.has(ref));
    if (playRefs.length === section.playRefs.length) return section;
    playbooksChanged = true;
    return {
      ...section,
      playRefs,
      updatedAt: new Date().toISOString(),
    };
  });

  if (playbooksChanged) {
    await setPlaybookSections(nextPlaybooks);
    changed = true;
  }

  if (changed) {
    void scheduleCloudLibrarySync();
  }

  return changed;
}
