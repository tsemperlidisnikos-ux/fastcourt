/** FastDraw native half/full aspect (iCoach MigrationFastDraw units) */
export const FD_HALF_COURT_ASPECT =
  49.21259689331055 / 45.931758880615234;
export const FD_FULL_COURT_ASPECT =
  (45.931758880615234 * 2) / 49.21259689331055;

export const COURT_REF_WIDTH_HALF = 680;
export const COURT_REF_WIDTH_FULL = 960;
export const HALF_COURT_BASKET_NY = 0.11;

export const OBJECT_COLORS: Record<string, string> = {
  offense: "#2563eb",
  defense: "#dc2626",
  ball: "#f59e0b",
  cone: "#f97316",
  text: "#111827",
  label: "#111827",
  flag: "#64748b",
  shadow: "#94a3b8",
  zone: "#3b82f6",
};

export const WHITEBOARD_INK_COLORS = [
  "#000000",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#eab308",
] as const;

export const WHITEBOARD_INK_WIDTH = 3;
