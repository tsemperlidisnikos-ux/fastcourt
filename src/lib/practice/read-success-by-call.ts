import {
  isReadTrackableItem,
  readItemLabel,
} from "@/lib/practice/read-success-scorecard";
import type { PracticeSession } from "@/types/library-meta";

function normalizeCallKey(call: string) {
  return call.trim().toLowerCase();
}

function playCallKey(playId: string, call: string) {
  return `${playId}|${normalizeCallKey(call)}`;
}

export interface ReadSuccessLookup {
  byCall: Map<string, { landed: number; missed: number }>;
  byPlayCall: Map<string, { landed: number; missed: number }>;
}

export function buildReadSuccessLookup(
  sessions: PracticeSession[],
): ReadSuccessLookup {
  const byCall = new Map<string, { landed: number; missed: number }>();
  const byPlayCall = new Map<string, { landed: number; missed: number }>();

  for (const session of sessions) {
    for (const item of session.items) {
      if (!isReadTrackableItem(item)) continue;
      if (item.readOutcome !== "landed" && item.readOutcome !== "missed") {
        continue;
      }
      const call = readItemLabel(item);
      const callKey = normalizeCallKey(call);
      const callBucket = byCall.get(callKey) ?? { landed: 0, missed: 0 };
      if (item.readOutcome === "landed") callBucket.landed += 1;
      else callBucket.missed += 1;
      byCall.set(callKey, callBucket);

      if (item.playId) {
        const pcKey = playCallKey(item.playId, call);
        const pcBucket = byPlayCall.get(pcKey) ?? { landed: 0, missed: 0 };
        if (item.readOutcome === "landed") pcBucket.landed += 1;
        else pcBucket.missed += 1;
        byPlayCall.set(pcKey, pcBucket);
      }
    }
  }

  return { byCall, byPlayCall };
}

export function lookupReadSuccessPct(
  lookup: ReadSuccessLookup,
  callLabel: string,
  playId?: string,
): number | null {
  if (playId) {
    const pc = lookup.byPlayCall.get(playCallKey(playId, callLabel));
    if (pc) {
      const marked = pc.landed + pc.missed;
      if (marked > 0) return Math.round((pc.landed / marked) * 100);
    }
  }
  const bucket = lookup.byCall.get(normalizeCallKey(callLabel));
  if (!bucket) return null;
  const marked = bucket.landed + bucket.missed;
  if (marked <= 0) return null;
  return Math.round((bucket.landed / marked) * 100);
}

/** Match timeout cue titles against longer Counter drill liveCall labels. */
export function lookupCounterSuccessPct(
  lookup: ReadSuccessLookup,
  cueTitle: string,
  defensePlayId?: string,
): number | null {
  const exact = lookupReadSuccessPct(lookup, cueTitle, defensePlayId);
  if (exact != null) return exact;

  const titleKey = normalizeCallKey(cueTitle);
  if (!titleKey) return null;

  if (defensePlayId) {
    let playLanded = 0;
    let playMissed = 0;
    for (const [key, bucket] of lookup.byPlayCall) {
      if (!key.startsWith(`${defensePlayId}|`)) continue;
      const callPart = key.slice(defensePlayId.length + 1);
      if (!callPart.includes(titleKey)) continue;
      playLanded += bucket.landed;
      playMissed += bucket.missed;
    }
    const playMarked = playLanded + playMissed;
    if (playMarked > 0) return Math.round((playLanded / playMarked) * 100);
  }

  let landed = 0;
  let missed = 0;
  for (const [call, bucket] of lookup.byCall) {
    if (!call.includes(titleKey)) continue;
    landed += bucket.landed;
    missed += bucket.missed;
  }
  const marked = landed + missed;
  if (marked <= 0) return null;
  return Math.round((landed / marked) * 100);
}

export function formatReadSuccessBadge(pct: number | null): string | null {
  if (pct == null) return null;
  return `${pct}% landed`;
}
