import type { GamePlanCategoryId } from "@/types/library-meta";

export const GAME_PLAN_CATEGORIES: ReadonlyArray<{
  id: GamePlanCategoryId;
  label: string;
}> = [
  { id: "ato", label: "ATO" },
  { id: "blob", label: "BLOB" },
  { id: "slob", label: "SLOB" },
  { id: "zone", label: "Vs Zone" },
  { id: "press", label: "Vs Press" },
  { id: "halfcourt", label: "Half Court" },
  { id: "transition", label: "Transition" },
  { id: "defense", label: "Defense" },
  { id: "special", label: "Special" },
] as const;

const CATEGORY_LABELS = new Map(
  GAME_PLAN_CATEGORIES.map((row) => [row.id, row.label]),
);

export function gamePlanCategoryLabel(
  categoryId: GamePlanCategoryId,
  customLabel?: string,
): string {
  if (categoryId === "custom") {
    return customLabel?.trim() || "Custom";
  }
  return CATEGORY_LABELS.get(categoryId) ?? categoryId;
}
