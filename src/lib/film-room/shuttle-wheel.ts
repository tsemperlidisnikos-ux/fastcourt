/** Seconds of video per radian of shuttle-wheel rotation (~8s per full turn). */
export const SHUTTLE_SECONDS_PER_RADIAN = 8 / (2 * Math.PI);

export function normalizeAngleDelta(radians: number): number {
  let delta = radians;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

export function angleDeltaToSeekSeconds(
  deltaRadians: number,
  secondsPerRadian = SHUTTLE_SECONDS_PER_RADIAN,
): number {
  return normalizeAngleDelta(deltaRadians) * secondsPerRadian;
}

export function clampSeekTime(time: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return Math.max(0, time);
  }
  return Math.min(Math.max(0, time), duration);
}

export function pointerAngleFromCenter(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  return Math.atan2(clientY - centerY, clientX - centerX);
}
