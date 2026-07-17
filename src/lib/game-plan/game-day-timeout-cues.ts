import type { CounterCoverageId } from "@/lib/film-room/film-counter-playbook";
import { COUNTER_COVERAGE_LABELS } from "@/lib/film-room/film-counter-playbook";
import type { FilmClipCounterSuggestion } from "@/lib/film-room/film-clip-analyze-types";
import type { GamePlanTimeoutCue } from "@/types/library-meta";

export function newGamePlanTimeoutCueId() {
  return `gtc_${crypto.randomUUID()}`;
}

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function timeoutCueSignature(cue: Pick<
  GamePlanTimeoutCue,
  "title" | "coverage" | "targetsPattern"
>) {
  return [
    cue.title.trim().toLowerCase(),
    cue.coverage.trim().toLowerCase(),
    cue.targetsPattern?.trim().toLowerCase() ?? "",
  ].join("|");
}

export function counterToTimeoutCue(
  counter: FilmClipCounterSuggestion,
  film?: { sessionId?: string; timestamp?: number },
  defensePlayId?: string,
): GamePlanTimeoutCue {
  return {
    id: newGamePlanTimeoutCueId(),
    title: counter.title,
    detail: counter.detail,
    coverage: counter.coverage,
    targetsPattern: counter.targetsPattern,
    trigger: counter.trigger,
    ballHandlerRule: counter.ballHandlerRule,
    screenerRule: counter.screenerRule,
    weakPoint: counter.weakPoint,
    priority: counter.priority,
    defensePlayId: defensePlayId?.trim() || undefined,
    sourceFilmSessionId: film?.sessionId,
    sourceFilmTimestamp: film?.timestamp,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeTimeoutCues(
  raw: GamePlanTimeoutCue[] | undefined,
): GamePlanTimeoutCue[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const cues: GamePlanTimeoutCue[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const detail = typeof row.detail === "string" ? row.detail.trim() : "";
    const coverage =
      typeof row.coverage === "string" ? row.coverage.trim() : "other";
    if (!title || !detail) continue;
    const cue: GamePlanTimeoutCue = {
      id: row.id?.trim() || newGamePlanTimeoutCueId(),
      title: title.slice(0, 120),
      detail: detail.slice(0, 500),
      coverage: coverage.slice(0, 40),
      targetsPattern:
        typeof row.targetsPattern === "string"
          ? row.targetsPattern.trim().slice(0, 40) || undefined
          : undefined,
      trigger:
        typeof row.trigger === "string"
          ? row.trigger.trim().slice(0, 120) || undefined
          : undefined,
      ballHandlerRule:
        typeof row.ballHandlerRule === "string"
          ? row.ballHandlerRule.trim().slice(0, 200) || undefined
          : undefined,
      screenerRule:
        typeof row.screenerRule === "string"
          ? row.screenerRule.trim().slice(0, 200) || undefined
          : undefined,
      weakPoint:
        typeof row.weakPoint === "string"
          ? row.weakPoint.trim().slice(0, 200) || undefined
          : undefined,
      priority:
        row.priority === "high" ||
        row.priority === "medium" ||
        row.priority === "low"
          ? row.priority
          : undefined,
      defensePlayId:
        typeof row.defensePlayId === "string"
          ? row.defensePlayId.trim() || undefined
          : undefined,
      sourceFilmSessionId: row.sourceFilmSessionId?.trim() || undefined,
      sourceFilmTimestamp:
        typeof row.sourceFilmTimestamp === "number" &&
        Number.isFinite(row.sourceFilmTimestamp)
          ? row.sourceFilmTimestamp
          : undefined,
      createdAt: row.createdAt || new Date().toISOString(),
    };
    const signature = timeoutCueSignature(cue);
    if (seen.has(signature)) continue;
    seen.add(signature);
    cues.push(cue);
  }
  return cues;
}

export function mergeTimeoutCues(
  existing: GamePlanTimeoutCue[] | undefined,
  incoming: GamePlanTimeoutCue[],
  maxTotal = 12,
): GamePlanTimeoutCue[] {
  const merged = [...normalizeTimeoutCues(existing)];
  const seen = new Set(merged.map(timeoutCueSignature));
  for (const cue of normalizeTimeoutCues(incoming)) {
    const signature = timeoutCueSignature(cue);
    if (seen.has(signature)) continue;
    seen.add(signature);
    merged.push(cue);
  }
  return sortTimeoutCues(merged).slice(0, maxTotal);
}

export function sortTimeoutCues(cues: GamePlanTimeoutCue[]): GamePlanTimeoutCue[] {
  return [...cues].sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority ?? "medium"] ?? 1;
    const pb = PRIORITY_RANK[b.priority ?? "medium"] ?? 1;
    if (pa !== pb) return pa - pb;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function pickTopTimeoutCues(
  cues: GamePlanTimeoutCue[] | undefined,
  limit = 3,
): GamePlanTimeoutCue[] {
  return sortTimeoutCues(normalizeTimeoutCues(cues)).slice(0, limit);
}

export function timeoutCueCoverageLabel(coverage: string) {
  const key = coverage as CounterCoverageId;
  return COUNTER_COVERAGE_LABELS[key] ?? coverage;
}

export function formatTimeoutCueBenchLine(cue: GamePlanTimeoutCue): string {
  const parts = [cue.title, timeoutCueCoverageLabel(cue.coverage)];
  if (cue.targetsPattern) parts.push(`vs ${cue.targetsPattern}`);
  return parts.join(" · ");
}
