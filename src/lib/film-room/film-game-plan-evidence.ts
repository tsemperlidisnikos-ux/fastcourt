import { formatFilmTimestamp } from "@/lib/film-room/film-game-plan-link";
import type {
  GamePlan,
  GamePlanFilmRef,
  GamePlanTimeoutCue,
  OpponentTendency,
} from "@/types/library-meta";

export type GamePlanFilmEvidenceSource =
  | "ref"
  | "tendency"
  | "timeout";

export interface GamePlanFilmEvidenceItem {
  id: string;
  sessionId: string;
  timestamp?: number;
  timeLabel: string;
  title: string;
  detail?: string;
  source: GamePlanFilmEvidenceSource;
  playId?: string;
  frameIndex?: number;
  readLabel?: string;
}

export function newGamePlanFilmRefId() {
  return `gpf_${crypto.randomUUID()}`;
}

export function normalizeFilmRefs(
  raw: GamePlanFilmRef[] | undefined,
): GamePlanFilmRef[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const refs: GamePlanFilmRef[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const sessionId = row.sessionId?.trim();
    if (!sessionId) continue;
    const label = row.label?.trim();
    if (!label) continue;
    const timestamp =
      typeof row.timestamp === "number" &&
      Number.isFinite(row.timestamp) &&
      row.timestamp >= 0
        ? row.timestamp
        : undefined;
    const signature = filmEvidenceSignature(sessionId, timestamp, label);
    if (seen.has(signature)) continue;
    seen.add(signature);
    refs.push({
      id: row.id?.trim() || newGamePlanFilmRefId(),
      sessionId,
      timestamp,
      label: label.slice(0, 120),
      detail: row.detail?.trim()?.slice(0, 240) || undefined,
      playId: row.playId?.trim() || undefined,
      frameIndex:
        typeof row.frameIndex === "number" &&
        Number.isFinite(row.frameIndex) &&
        row.frameIndex >= 0
          ? Math.floor(row.frameIndex)
          : undefined,
      readLabel: row.readLabel?.trim()?.slice(0, 80) || undefined,
      createdAt: row.createdAt || new Date().toISOString(),
    });
  }
  return refs;
}

export function filmEvidenceSignature(
  sessionId: string,
  timestamp?: number,
  label?: string,
) {
  const timeKey =
    timestamp != null && Number.isFinite(timestamp)
      ? Math.round(timestamp * 10) / 10
      : "na";
  return `${sessionId}|${timeKey}|${(label ?? "").trim().toLowerCase()}`;
}

export function createGamePlanFilmRef(input: {
  sessionId: string;
  timestamp?: number;
  label: string;
  detail?: string;
  playId?: string;
  frameIndex?: number;
  readLabel?: string;
}): GamePlanFilmRef {
  return {
    id: newGamePlanFilmRefId(),
    sessionId: input.sessionId.trim(),
    timestamp:
      input.timestamp != null &&
      Number.isFinite(input.timestamp) &&
      input.timestamp >= 0
        ? input.timestamp
        : undefined,
    label: input.label.trim().slice(0, 120),
    detail: input.detail?.trim()?.slice(0, 240) || undefined,
    playId: input.playId?.trim() || undefined,
    frameIndex:
      input.frameIndex != null &&
      Number.isFinite(input.frameIndex) &&
      input.frameIndex >= 0
        ? Math.floor(input.frameIndex)
        : undefined,
    readLabel: input.readLabel?.trim()?.slice(0, 80) || undefined,
    createdAt: new Date().toISOString(),
  };
}

export function mergeFilmRefs(
  existing: GamePlanFilmRef[] | undefined,
  incoming: GamePlanFilmRef[],
): GamePlanFilmRef[] {
  const merged = [...normalizeFilmRefs(existing)];
  const seen = new Set(
    merged.map((row) => filmEvidenceSignature(row.sessionId, row.timestamp, row.label)),
  );
  for (const row of normalizeFilmRefs(incoming)) {
    const signature = filmEvidenceSignature(row.sessionId, row.timestamp, row.label);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(row);
  }
  return merged;
}

function evidenceFromTendency(row: OpponentTendency): GamePlanFilmEvidenceItem | null {
  const sessionId = row.filmSessionId?.trim();
  if (!sessionId) return null;
  const timestamp =
    typeof row.filmTimestamp === "number" &&
    Number.isFinite(row.filmTimestamp) &&
    row.filmTimestamp >= 0
      ? row.filmTimestamp
      : undefined;
  return {
    id: `tendency:${row.id}`,
    sessionId,
    timestamp,
    timeLabel: formatFilmTimestamp(timestamp),
    title: row.label,
    detail: row.notes?.trim() || undefined,
    source: "tendency",
  };
}

function evidenceFromTimeoutCue(row: GamePlanTimeoutCue): GamePlanFilmEvidenceItem | null {
  const sessionId = row.sourceFilmSessionId?.trim();
  if (!sessionId) return null;
  const timestamp =
    typeof row.sourceFilmTimestamp === "number" &&
    Number.isFinite(row.sourceFilmTimestamp) &&
    row.sourceFilmTimestamp >= 0
      ? row.sourceFilmTimestamp
      : undefined;
  return {
    id: `timeout:${row.id}`,
    sessionId,
    timestamp,
    timeLabel: formatFilmTimestamp(timestamp),
    title: row.title,
    detail: row.detail?.trim() || undefined,
    source: "timeout",
  };
}

function evidenceFromRef(row: GamePlanFilmRef): GamePlanFilmEvidenceItem {
  return {
    id: `ref:${row.id}`,
    sessionId: row.sessionId,
    timestamp: row.timestamp,
    timeLabel: formatFilmTimestamp(row.timestamp),
    title: row.label,
    detail: row.detail,
    source: "ref",
    playId: row.playId,
    frameIndex: row.frameIndex,
    readLabel: row.readLabel,
  };
}

/** Collect deduped film clips linked on a game plan (refs, board tags, timeout cues). */
export function collectGamePlanFilmEvidence(plan: GamePlan): GamePlanFilmEvidenceItem[] {
  const items: GamePlanFilmEvidenceItem[] = [];
  const seen = new Set<string>();

  for (const row of normalizeFilmRefs(plan.filmRefs)) {
    const item = evidenceFromRef(row);
    const signature = filmEvidenceSignature(item.sessionId, item.timestamp, item.title);
    if (seen.has(signature)) continue;
    seen.add(signature);
    items.push(item);
  }

  for (const row of plan.opponentBoard ?? []) {
    const item = evidenceFromTendency(row);
    if (!item) continue;
    const signature = filmEvidenceSignature(item.sessionId, item.timestamp, item.title);
    if (seen.has(signature)) continue;
    seen.add(signature);
    items.push(item);
  }

  for (const row of plan.timeoutCues ?? []) {
    const item = evidenceFromTimeoutCue(row);
    if (!item) continue;
    const signature = filmEvidenceSignature(item.sessionId, item.timestamp, item.title);
    if (seen.has(signature)) continue;
    seen.add(signature);
    items.push(item);
  }

  return items.sort((a, b) => {
    const ta = a.timestamp ?? Number.POSITIVE_INFINITY;
    const tb = b.timestamp ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.title.localeCompare(b.title);
  });
}

export function gamePlanHasFilmEvidence(plan: GamePlan): boolean {
  return collectGamePlanFilmEvidence(plan).length > 0;
}

export function createDisruptionFilmRef(input: {
  sessionId: string;
  timestamp: number;
  label: string;
  detail?: string;
  playId: string;
  frameIndex?: number;
  readLabel?: string;
}): GamePlanFilmRef {
  const timeLabel = formatFilmTimestamp(input.timestamp);
  return createGamePlanFilmRef({
    sessionId: input.sessionId,
    timestamp: input.timestamp,
    label: input.label.trim() || (timeLabel ? `Read @ ${timeLabel}` : "Disruption read"),
    detail: input.detail?.trim()?.slice(0, 240) || undefined,
    playId: input.playId,
    frameIndex: input.frameIndex,
    readLabel: input.readLabel,
  });
}

export function createAiScoutFilmRef(
  sessionId: string,
  timestamp: number,
  summary: string,
): GamePlanFilmRef {
  const timeLabel = formatFilmTimestamp(timestamp);
  return createGamePlanFilmRef({
    sessionId,
    timestamp,
    label: timeLabel ? `AI scout @ ${timeLabel}` : "AI scout",
    detail: summary.trim().slice(0, 240) || undefined,
  });
}

export function createManualFilmRef(
  sessionId: string,
  sessionTitle: string,
  timestamp: number,
  tendencyLabel: string,
): GamePlanFilmRef {
  const timeLabel = formatFilmTimestamp(timestamp);
  return createGamePlanFilmRef({
    sessionId,
    timestamp,
    label: tendencyLabel.trim() || sessionTitle.trim() || "Film clip",
    detail: sessionTitle.trim()
      ? `${sessionTitle.trim()}${timeLabel ? ` @ ${timeLabel}` : ""}`
      : undefined,
  });
}
