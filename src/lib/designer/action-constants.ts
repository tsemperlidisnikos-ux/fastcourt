import type { ActionType } from "@/types/designer";

export const ACTION_COLORS: Record<ActionType, string> = {
  cut: "#000000",
  pass: "#2563eb",
  dribble: "#000000",
  screen: "#dc2626",
  curl: "#000000",
  handoff: "#000000",
  shoot: "#16a34a",
};

export const SHOT_DASH = [10, 7];
export const PASS_DASH = [10, 8];
/** Dribble zig-zag at half-court ref width (680px); scaled per court via getDribbleWaveScale. */
export const DRIBBLE_WAVE_LENGTH = 15;
export const DRIBBLE_WAVE_AMPLITUDE = 10;
export const DEFAULT_ARROW_STROKE = 2;
export const MIN_ACTION_LENGTH_NORM = 0.015;
export const FREEHAND_MIN_POINT_DIST_NORM = 0.009;
export const FREEHAND_MIN_PATH_LEN = 20;
export const DEFAULT_LINE_THICKNESS = 3;
/** Ball transfers during hand-off line reveal at this progress (legacy). */
export const HANDOFF_ANIM_BALL_PROGRESS = 0.92;

export const LINE_ACTION_CHOICES: Array<{
  value: ActionType;
  icon: string;
  label: string;
  shortcut?: string;
}> = [
  { value: "cut", icon: "↗", label: "Cut", shortcut: "C" },
  { value: "pass", icon: "➜", label: "Pass", shortcut: "P" },
  { value: "dribble", icon: "〰", label: "Dribble", shortcut: "B" },
  { value: "screen", icon: "▬", label: "Screen", shortcut: "R" },
  { value: "curl", icon: "↪", label: "Curl" },
  { value: "handoff", icon: "⇄", label: "Hand-off" },
];
