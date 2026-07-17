import { COUNTER_COVERAGE_LABELS } from "@/lib/film-room/film-counter-playbook";
import type { DefenseCounterMeta } from "@/types/library";

type CounterBadgeMeta = Pick<
  DefenseCounterMeta,
  "enabled" | "coverages" | "vsPatterns"
>;

const SHORT_COVERAGE: Record<string, string> = {
  ice: "ICE",
  switch: "Switch",
  drop: "Drop",
  blitz: "Blitz",
  hedge: "Hedge",
  show: "Show",
  hard_show: "Hard show",
  peel: "Peel",
  cross: "Cross",
  zone_bump: "Zone bump",
  trap: "Trap",
  switch_cross: "Switch cross",
  other: "Custom",
};

export function isCounterLibraryItem(
  item: { defenseCounter?: CounterBadgeMeta } | null | undefined,
): boolean {
  return Boolean(item?.defenseCounter?.enabled);
}

export function formatCounterLibraryBadgeLabel(meta: CounterBadgeMeta): string {
  const coverage = meta.coverages[0];
  if (!coverage) return "Counter";
  const short =
    SHORT_COVERAGE[coverage] ??
    COUNTER_COVERAGE_LABELS[coverage as keyof typeof COUNTER_COVERAGE_LABELS] ??
    coverage;
  return `Counter · ${short}`;
}

export function formatCounterLibraryBadgeTitle(meta: CounterBadgeMeta): string {
  const coverages = meta.coverages
    .map(
      (id) =>
        COUNTER_COVERAGE_LABELS[id as keyof typeof COUNTER_COVERAGE_LABELS] ??
        SHORT_COVERAGE[id] ??
        id,
    )
    .filter(Boolean);
  const vs = meta.vsPatterns.filter(Boolean);
  const parts: string[] = ["Counter Library"];
  if (coverages.length) parts.push(coverages.join(", "));
  if (vs.length) parts.push(`vs ${vs.join(", ")}`);
  return parts.join(" · ");
}
