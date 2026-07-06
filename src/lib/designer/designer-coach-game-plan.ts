import { collectPlanCoverages } from "@/lib/game-plan/read-recommendations";
import {
  formatGamePlanDate,
  isGamePlanUpcoming,
  sortGamePlans,
} from "@/lib/game-plan/game-plan-items";
import {
  inferCounterCoverageFromText,
  normalizeCounterCoverage,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import type { FilmClipCounterSuggestion } from "@/lib/film-room/film-clip-analyze-types";
import type { GamePlan, GamePlanTimeoutCue } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export interface DesignerCoachLinkedPlayRef {
  playId: string;
  title: string;
  reason: string;
}

export const DESIGNER_COACH_GAME_PLAN_STORAGE_KEY =
  "designer-coach-game-plan-v1";

export interface DesignerCoachGamePlanSnapshot {
  planId: string;
  title: string;
  opponent: string;
  gameDate: string;
  team: string;
  scoutingNotes?: string;
  opponentTendencies: Array<{
    kind: string;
    label: string;
    notes?: string;
  }>;
  timeoutCues: Array<{
    title: string;
    detail: string;
    coverage: string;
    targetsPattern?: string;
    priority?: string;
  }>;
  preferredCoverages: string[];
  defensePlayIds: string[];
}

export function filterDesignerCoachGamePlans(
  plans: GamePlan[],
  team?: string,
): GamePlan[] {
  const trimmedTeam = team?.trim();
  return sortGamePlans(
    plans.filter((plan) => {
      if (plan.status === "archived") return false;
      if (!trimmedTeam) return true;
      return plan.team === trimmedTeam;
    }),
  );
}

export function resolveDesignerCoachGamePlanId(
  plans: GamePlan[],
  team: string | undefined,
  storedId: string | null,
): string | null {
  const eligible = filterDesignerCoachGamePlans(plans, team);
  if (!eligible.length) return null;
  if (storedId && eligible.some((plan) => plan.id === storedId)) {
    return storedId;
  }
  const upcoming = eligible.find((plan) => isGamePlanUpcoming(plan));
  return upcoming?.id ?? eligible[0]?.id ?? null;
}

export function buildDesignerCoachGamePlanSnapshot(
  plan: GamePlan,
): DesignerCoachGamePlanSnapshot {
  return {
    planId: plan.id,
    title: plan.title,
    opponent: plan.opponent,
    gameDate: plan.gameDate,
    team: plan.team,
    scoutingNotes: plan.scoutingNotes?.trim() || undefined,
    opponentTendencies: (plan.opponentBoard ?? []).map((row) => ({
      kind: row.kind,
      label: row.label,
      notes: row.notes?.trim() || undefined,
    })),
    timeoutCues: (plan.timeoutCues ?? []).map((cue) => ({
      title: cue.title,
      detail: cue.detail,
      coverage: cue.coverage,
      targetsPattern: cue.targetsPattern,
      priority: cue.priority,
    })),
    preferredCoverages: collectPlanCoverages(plan),
    defensePlayIds: plan.entries
      .filter((entry) => entry.categoryId === "defense" && entry.playId)
      .map((entry) => entry.playId!),
  };
}

export function formatDesignerCoachGamePlanChip(
  snapshot: DesignerCoachGamePlanSnapshot,
): string {
  const date = formatGamePlanDate(snapshot.gameDate);
  const bits = [`vs ${snapshot.opponent}`];
  if (date) bits.push(date);
  if (snapshot.preferredCoverages.length) {
    bits.push(snapshot.preferredCoverages.join(", "));
  }
  return bits.join(" · ");
}

export function buildDesignerCoachGamePlanPromptSection(
  snapshot: DesignerCoachGamePlanSnapshot,
): string {
  const lines = [
    `Opponent: ${snapshot.opponent}`,
    `Game date: ${snapshot.gameDate}`,
    `Team: ${snapshot.team}`,
  ];

  if (snapshot.scoutingNotes) {
    lines.push(`Scouting notes: ${snapshot.scoutingNotes.slice(0, 600)}`);
  }

  if (snapshot.opponentTendencies.length) {
    lines.push("Opponent tendencies:");
    for (const row of snapshot.opponentTendencies.slice(0, 6)) {
      const note = row.notes ? ` — ${row.notes}` : "";
      lines.push(`- ${row.label} (${row.kind})${note}`);
    }
  }

  if (snapshot.timeoutCues.length) {
    lines.push("Saved timeout counters:");
    for (const cue of snapshot.timeoutCues.slice(0, 6)) {
      lines.push(
        `- ${cue.title} [${cue.coverage}]${cue.targetsPattern ? ` vs ${cue.targetsPattern}` : ""}: ${cue.detail}`,
      );
    }
  }

  if (snapshot.preferredCoverages.length) {
    lines.push(
      `Preferred coverages vs this opponent: ${snapshot.preferredCoverages.join(", ")}`,
    );
  }

  return lines.join("\n");
}

function patternMatchesCue(patterns: string[], targetsPattern?: string) {
  if (!targetsPattern?.trim()) return false;
  const token = targetsPattern.trim().toLowerCase();
  return patterns.some((pattern) => pattern.toLowerCase() === token);
}

function scoutHaystack(plan: GamePlan) {
  const parts = [
    plan.scoutingNotes ?? "",
    ...(plan.opponentBoard ?? []).map(
      (row) => `${row.label} ${row.notes ?? ""}`,
    ),
  ];
  return parts.join(" ").toLowerCase();
}

function coverageFromScoutText(text: string): CounterCoverageId | null {
  const coverage = inferCounterCoverageFromText(text, text);
  return coverage === "other" ? null : coverage;
}

function counterFromTimeoutCue(
  cue: GamePlanTimeoutCue,
  opponent: string,
): FilmClipCounterSuggestion {
  return {
    title: cue.title,
    detail: `${cue.detail} (saved for vs ${opponent})`,
    coverage: normalizeCounterCoverage(cue.coverage),
    targetsPattern: cue.targetsPattern,
    priority: cue.priority ?? "high",
    trigger: cue.trigger,
    ballHandlerRule: cue.ballHandlerRule,
    screenerRule: cue.screenerRule,
    weakPoint: cue.weakPoint,
  };
}

/** Add scout-informed counters and boost matches for the active game plan. */
export function mergeGamePlanCounters(
  counters: FilmClipCounterSuggestion[],
  patterns: string[],
  plan: GamePlan | null | undefined,
): FilmClipCounterSuggestion[] {
  if (!plan) return counters;

  const merged: FilmClipCounterSuggestion[] = [];
  const seen = new Set<string>();
  const coverages = collectPlanCoverages(plan);
  const hay = scoutHaystack(plan);

  const push = (counter: FilmClipCounterSuggestion) => {
    const key = `${counter.title}::${counter.coverage}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(counter);
  };

  for (const cue of plan.timeoutCues ?? []) {
    const matchesPattern =
      patternMatchesCue(patterns, cue.targetsPattern) ||
      coverages.includes(normalizeCounterCoverage(cue.coverage));
    if (matchesPattern || patterns.length === 0) {
      push(counterFromTimeoutCue(cue, plan.opponent));
    }
  }

  const scoutCoverage = coverageFromScoutText(hay);
  if (scoutCoverage && patterns.length > 0) {
    push({
      title: `Scout: ${plan.opponent} runs ${scoutCoverage.replace(/_/g, " ")}`,
      detail: `Game plan scouting points to ${scoutCoverage.replace(/_/g, " ")} — prioritize that counter vs this ${patterns[0]} look.`,
      coverage: scoutCoverage,
      targetsPattern: patterns[0],
      priority: "high",
    });
  }

  for (const counter of counters) {
    const boosted =
      coverages.includes(counter.coverage) ||
      (scoutCoverage && counter.coverage === scoutCoverage)
        ? {
            ...counter,
            priority:
              counter.priority === "low"
                ? ("medium" as const)
                : ("high" as const),
            detail: `${counter.detail} · Aligns with scout vs ${plan.opponent}`,
          }
        : counter;
    push(boosted);
  }

  return merged.slice(0, 6);
}

export function gamePlanDefenseLinkedPlays(
  plan: GamePlan | null | undefined,
  library: StoredPlay[],
  excludeId: string,
): DesignerCoachLinkedPlayRef[] {
  if (!plan) return [];

  const byId = new Map(library.map((play) => [play.id, play]));
  const linked: DesignerCoachLinkedPlayRef[] = [];
  const seen = new Set<string>();

  for (const entry of plan.entries) {
    if (!entry.playId || entry.playId === excludeId || seen.has(entry.playId)) {
      continue;
    }
    if (entry.categoryId !== "defense" && entry.categoryId !== "halfcourt") {
      continue;
    }
    const play = byId.get(entry.playId);
    if (!play) continue;
    seen.add(entry.playId);
    linked.push({
      playId: play.id,
      title: play.title,
      reason: `On game plan vs ${plan.opponent}`,
    });
  }

  return linked.slice(0, 4);
}
