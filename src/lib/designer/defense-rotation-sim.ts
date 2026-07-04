import {
  guardRotationFromStagePoint,
  normalizeDefenseMarkerStyle,
} from "@/lib/designer/defense-marker-style";
import type { CourtType, DesignerFrame, DesignerObject } from "@/types/designer";
import type { AnimationExportSample } from "@/lib/designer/animation-export";

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/** Ball carrier or ball object — primary rotation target for help-side guards. */
export function resolveBallFocus(objects: DesignerObject[]): { x: number; y: number } | null {
  const ballObject = objects.find((obj) => obj.kind === "ball");
  if (ballObject) return { x: ballObject.x, y: ballObject.y };

  const carrier = objects.find((obj) => obj.kind === "offense" && obj.hasBall);
  if (carrier) return { x: carrier.x, y: carrier.y };

  return null;
}

function nearestOffense(
  defender: DesignerObject,
  objects: DesignerObject[],
  excludeBallFocus: boolean,
) {
  let best: DesignerObject | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const obj of objects) {
    if (obj.kind !== "offense") continue;
    if (excludeBallFocus && obj.hasBall) continue;
    const d = dist2(defender.x, defender.y, obj.x, obj.y);
    if (d < bestDist) {
      bestDist = d;
      best = obj;
    }
  }
  return best;
}

function rotationToward(
  defender: DesignerObject,
  target: { x: number; y: number },
) {
  return guardRotationFromStagePoint(
    defender.x,
    defender.y,
    target.x,
    target.y,
  );
}

/**
 * Rotate guard defenders to face ball / nearest man (preview-only; does not mutate play).
 */
export function simulateGuardRotations(
  objects: DesignerObject[],
  options?: { preferBall?: boolean },
): DesignerObject[] {
  const preferBall = options?.preferBall ?? true;
  const ballFocus = preferBall ? resolveBallFocus(objects) : null;

  return objects.map((obj) => {
    if (obj.kind !== "defense") return obj;
    if (normalizeDefenseMarkerStyle(obj.defenseStyle) !== "guard") return obj;

    let target = ballFocus;
    if (!target) {
      const man = nearestOffense(obj, objects, false);
      if (!man) return obj;
      target = { x: man.x, y: man.y };
    } else {
      const man = nearestOffense(obj, objects, true);
      if (man) {
        const ballDist = dist2(obj.x, obj.y, target.x, target.y);
        const manDist = dist2(obj.x, obj.y, man.x, man.y);
        if (manDist < ballDist * 0.55) {
          target = { x: man.x, y: man.y };
        }
      }
    }

    return {
      ...obj,
      rotation: rotationToward(obj, {
        x: clamp01(target.x),
        y: clamp01(target.y),
      }),
    };
  });
}

export function simulateGuardRotationsForFrame(
  frame: DesignerFrame,
  _courtType: CourtType,
  options?: { preferBall?: boolean },
) {
  return simulateGuardRotations(frame.objects, options);
}

export function applyDefenseRotationToSample(
  sample: AnimationExportSample | null,
): AnimationExportSample | null {
  if (!sample?.runtime?.objects) return sample;
  return {
    ...sample,
    runtime: {
      ...sample.runtime,
      objects: simulateGuardRotations(sample.runtime.objects),
    },
  };
}
