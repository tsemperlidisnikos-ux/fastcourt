import type {
  PracticeSession,
  PracticeSessionItem,
} from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export type ResolvedPracticeRow = {
  item: PracticeSessionItem;
  play: StoredPlay | null;
  index: number;
  label: string | null;
};

export function newPracticeItemId() {
  return `pi_${crypto.randomUUID()}`;
}

export function normalizePracticeItem(
  raw: Partial<PracticeSessionItem> & { playId?: string },
  index: number,
): PracticeSessionItem {
  return {
    id: raw.id || `pi_legacy_${index}_${raw.playId || "cue"}`,
    playId: raw.playId || undefined,
    cueLabel: raw.cueLabel?.trim() || undefined,
    durationMin: Math.max(1, Number(raw.durationMin) || 10),
    notes: raw.notes || "",
    videoUrl: raw.videoUrl || "",
  };
}

export function normalizePracticeSession(session: PracticeSession): PracticeSession {
  return {
    ...session,
    items: (session.items || []).map((item, index) =>
      normalizePracticeItem(item, index),
    ),
  };
}

export function defaultPracticeItemDuration(play?: StoredPlay | null) {
  if (!play) return 10;
  return play.type === "drill" ? 10 : 15;
}

export function getPracticeSessionTotalMinutes(session: PracticeSession | null) {
  if (!session?.items?.length) return 0;
  return session.items.reduce(
    (sum, item) => sum + (Number(item.durationMin) || 0),
    0,
  );
}

export function resolvePracticeSessionItems(
  session: PracticeSession | null,
  playsById: Map<string, StoredPlay>,
): ResolvedPracticeRow[] {
  return (session?.items || []).map((item, index) => {
    const play = item.playId ? playsById.get(item.playId) ?? null : null;
    const label = play?.title || item.cueLabel || null;
    return { item, play, index, label };
  });
}

export function isPracticeBlockRunnable(row: ResolvedPracticeRow) {
  return !!(row.play || (row.item.cueLabel || "").trim());
}

export function getPracticeItemVideoUrl(
  item: PracticeSessionItem,
  play: StoredPlay | null,
) {
  const slot = (item.videoUrl || "").trim();
  if (slot) return slot;
  return (play?.videoUrl || "").trim();
}

export function findPlayByNameHints(
  hints: string[],
  plays: StoredPlay[],
): StoredPlay | null {
  for (const hint of hints) {
    const q = String(hint || "").trim().toLowerCase();
    if (!q) continue;
    const exact = plays.find((p) => (p.title || "").trim().toLowerCase() === q);
    if (exact) return exact;
    const partial = plays.find((p) =>
      (p.title || "").toLowerCase().includes(q),
    );
    if (partial) return partial;
  }
  for (const hint of hints) {
    const words = String(hint || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    for (const word of words) {
      const match = plays.find((p) =>
        (p.title || "").toLowerCase().includes(word),
      );
      if (match) return match;
    }
  }
  return null;
}

export function templateSpecToSessionItems(
  specItems: Array<{
    playId?: string | null;
    cueLabel?: string;
    matchNames?: string[];
    durationMin: number;
    notes?: string;
  }>,
  plays: StoredPlay[],
): PracticeSessionItem[] {
  const byId = new Map(plays.map((p) => [p.id, p]));
  return (specItems || []).map((spec, index) => {
    if (spec.playId) {
      const play = byId.get(spec.playId);
      if (play) {
        return normalizePracticeItem(
          {
            playId: play.id,
            durationMin: spec.durationMin,
            notes: spec.notes || "",
          },
          index,
        );
      }
    }
    const matched = spec.matchNames?.length
      ? findPlayByNameHints(spec.matchNames, plays)
      : null;
    if (matched) {
      return normalizePracticeItem(
        {
          playId: matched.id,
          durationMin: spec.durationMin,
          notes: spec.notes || "",
        },
        index,
      );
    }
    return normalizePracticeItem(
      {
        cueLabel: spec.cueLabel || spec.matchNames?.[0] || "Block",
        durationMin: spec.durationMin,
        notes: spec.notes || "",
      },
      index,
    );
  });
}

export function buildPracticeShareItems(
  session: PracticeSession,
  playsById: Map<string, StoredPlay>,
) {
  return resolvePracticeSessionItems(session, playsById)
    .filter(isPracticeBlockRunnable)
    .map(({ item, play }) => {
      const videoUrl = getPracticeItemVideoUrl(item, play);
      return {
        durationMin: item.durationMin,
        notes: item.notes || "",
        cueLabel: !play ? item.cueLabel : undefined,
        videoUrl: videoUrl || undefined,
        play: play ?? undefined,
      };
    });
}
