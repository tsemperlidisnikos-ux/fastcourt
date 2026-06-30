/** Shared animation timing (playback + export). */
import type { DesignerFrame } from "@/types/designer";
import type { ActionType } from "@/types/designer";

export const ANIM_BASE_STEP_MS = 720;
export const ANIM_FRAME_TRANSITION_MS = 260;
export const ANIM_EMPTY_FRAME_HOLD_MS = 400;
export const ANIM_FINAL_HOLD_MS = 600;

export const DEFAULT_FRAME_ANIM_DURATION_SEC = 1;
export const MIN_FRAME_ANIM_DURATION_SEC = 0.25;
export const MAX_FRAME_ANIM_DURATION_SEC = 8;

export const MIN_PLAYBACK_SPEED = 0.1;
export const MAX_PLAYBACK_SPEED = 2;
export const DEFAULT_PLAYBACK_SPEED = 0.1;

export function clampPlaybackSpeed(value: number) {
  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, value));
}

/** Stored defaults from earlier releases — treat as unset. */
const LEGACY_IMPLICIT_PLAYBACK_SPEEDS = new Set([1, 0.4]);

export function resolvePlaybackSpeed(animSpeed?: number): number {
  if (animSpeed == null || LEGACY_IMPLICIT_PLAYBACK_SPEEDS.has(animSpeed)) {
    return DEFAULT_PLAYBACK_SPEED;
  }
  return clampPlaybackSpeed(animSpeed);
}

export function resolveFrameAnimDurationSec(frame: DesignerFrame): number {
  const sec = frame.animDurationSec ?? DEFAULT_FRAME_ANIM_DURATION_SEC;
  return Math.min(
    MAX_FRAME_ANIM_DURATION_SEC,
    Math.max(MIN_FRAME_ANIM_DURATION_SEC, sec),
  );
}

export function frameActionStepDurationMs(
  frame: DesignerFrame,
  stepCount: number,
  speed = 1,
): number {
  const steps = Math.max(1, stepCount);
  return (resolveFrameAnimDurationSec(frame) * 1000) / steps / speed;
}

export function frameEmptyHoldDurationMs(frame: DesignerFrame, speed = 1): number {
  return (resolveFrameAnimDurationSec(frame) * 1000) / speed;
}

export function animEaseInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Maps eased step progress to line draw, line hide, and player motion phases. */
export function resolveStepAnimPhases(
  _primaryActionType: ActionType | undefined,
  eased: number,
): { lineProgress: number; stepProgress: number; showActiveLine: boolean } {
  const t = Math.min(1, Math.max(0, eased));

  if (t < 0.35) {
    return {
      lineProgress: t / 0.35,
      stepProgress: 0,
      showActiveLine: true,
    };
  }
  if (t < 0.45) {
    return {
      lineProgress: 1,
      stepProgress: 0,
      showActiveLine: false,
    };
  }
  return {
    lineProgress: 1,
    stepProgress: (t - 0.45) / 0.55,
    showActiveLine: false,
  };
}
