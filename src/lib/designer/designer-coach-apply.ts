import {
  MAX_FRAME_ANIM_DURATION_SEC,
  MIN_FRAME_ANIM_DURATION_SEC,
} from "@/lib/designer/animation-timing";
import type { DefenseMarkerStyle } from "@/lib/designer/defense-marker-style";
import {
  canPlaceRosterPlayer,
  nextAvailableJersey,
  type DesignerRosterMode,
} from "@/lib/designer/player-limits";
import type {
  ActionTiming,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
} from "@/types/designer";
import type {
  FilmClipCoachingCategoryId,
  FilmClipCoachingPriority,
} from "@/lib/film-room/film-clip-analyze-types";

export type DesignerCoachFix =
  | { type: "move"; objectId: string; x: number; y: number }
  | { type: "frameDuration"; seconds: number }
  | { type: "actionTiming"; actionId: string; timing: ActionTiming }
  | {
      type: "addDefense";
      objectId: string;
      x: number;
      y: number;
      label: string;
      defenseStyle: DefenseMarkerStyle;
      rotation?: number;
    }
  | {
      type: "setDefenseStyle";
      objectId: string;
      defenseStyle: DefenseMarkerStyle;
      rotation?: number;
    };

export interface DesignerCoachApplyBundle {
  key: string;
  category: FilmClipCoachingCategoryId;
  title: string;
  detail: string;
  priority?: FilmClipCoachingPriority;
  fixes: DesignerCoachFix[];
}

export function clampNorm(value: number) {
  return Math.min(0.98, Math.max(0.02, value));
}

export function previewObjectIdsForFixes(fixes: DesignerCoachFix[]): string[] {
  const ids: string[] = [];
  for (const fix of fixes) {
    if (fix.type === "move" && !ids.includes(fix.objectId)) {
      ids.push(fix.objectId);
    }
  }
  return ids;
}

export function previewSelectionForFixes(
  fixes: DesignerCoachFix[],
  frame?: DesignerFrame,
): { objectId?: string; actionId?: string } {
  for (const fix of fixes) {
    if (fix.type === "move" || fix.type === "setDefenseStyle") {
      return { objectId: fix.objectId };
    }
  }
  for (const fix of fixes) {
    if (fix.type === "addDefense" && frame) {
      const nearest = closestObjectTo(frame.objects, fix.x, fix.y, "offense");
      if (nearest) return { objectId: nearest.id };
      return { objectId: fix.objectId };
    }
  }
  for (const fix of fixes) {
    if (fix.type === "actionTiming") return { actionId: fix.actionId };
  }
  return {};
}

function closestObjectTo(
  objects: DesignerObject[],
  x: number,
  y: number,
  kind?: DesignerObject["kind"],
) {
  let best: DesignerObject | null = null;
  let bestDist = Infinity;
  for (const object of objects) {
    if (kind && object.kind !== kind) continue;
    const d = Math.hypot(object.x - x, object.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = object;
    }
  }
  return best;
}

export function applyFixesToFrame(
  frame: DesignerFrame,
  fixes: DesignerCoachFix[],
  options?: { rosterMode?: DesignerRosterMode },
): DesignerFrame {
  if (!fixes.length) return frame;

  const rosterMode = options?.rosterMode ?? "play";
  let objects = frame.objects.map((object) => ({ ...object }));
  let actions = frame.actions.map((action) => ({ ...action }));
  let animDurationSec = frame.animDurationSec;

  for (const fix of fixes) {
    switch (fix.type) {
      case "move":
        objects = objects.map((object) =>
          object.id === fix.objectId
            ? { ...object, x: fix.x, y: fix.y }
            : object,
        );
        break;
      case "frameDuration":
        animDurationSec = Math.min(
          MAX_FRAME_ANIM_DURATION_SEC,
          Math.max(MIN_FRAME_ANIM_DURATION_SEC, fix.seconds),
        );
        break;
      case "actionTiming":
        actions = actions.map((action) =>
          action.id === fix.actionId
            ? { ...action, timing: fix.timing }
            : action,
        );
        break;
      case "setDefenseStyle":
        objects = objects.map((object) => {
          if (object.id !== fix.objectId || object.kind !== "defense") return object;
          if (fix.defenseStyle === "guard") {
            return {
              ...object,
              defenseStyle: "guard" as const,
              rotation: fix.rotation ?? object.rotation ?? 0,
            };
          }
          return {
            ...object,
            defenseStyle: "mark" as const,
            rotation: undefined,
          };
        });
        break;
      case "addDefense":
        if (objects.some((object) => object.id === fix.objectId)) break;
        if (!canPlaceRosterPlayer(objects, "defense", rosterMode)) break;
        objects = [
          ...objects,
          {
            id: fix.objectId,
            kind: "defense" as const,
            x: fix.x,
            y: fix.y,
            label: fix.label,
            defenseStyle: fix.defenseStyle,
            ...(fix.defenseStyle === "guard"
              ? { rotation: fix.rotation ?? 0 }
              : {}),
          },
        ];
        break;
    }
  }

  return {
    ...frame,
    objects,
    actions,
    animDurationSec,
  };
}

export function separatePlayerPair(
  a: DesignerObject,
  b: DesignerObject,
  minDist: number,
): DesignerCoachFix[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= minDist) return [];

  const ux = distance > 0.0001 ? dx / distance : 1;
  const uy = distance > 0.0001 ? dy / distance : 0;
  const push = (minDist - distance) / 2 + 0.006;

  return [
    {
      type: "move",
      objectId: a.id,
      x: clampNorm(a.x - ux * push),
      y: clampNorm(a.y - uy * push),
    },
    {
      type: "move",
      objectId: b.id,
      x: clampNorm(b.x + ux * push),
      y: clampNorm(b.y + uy * push),
    },
  ];
}

/** Move deepest paint player toward nearest corner. */
export function relievePaintCongestion(
  players: DesignerObject[],
): DesignerCoachFix[] {
  if (players.length < 3) return [];
  const target = [...players].sort((left, right) => right.y - left.y)[0];
  if (!target) return [];

  const toLeft = target.x < 0.5;
  return [
    {
      type: "move",
      objectId: target.id,
      x: clampNorm(toLeft ? 0.12 : 0.88),
      y: clampNorm(Math.min(target.y, 0.58)),
    },
  ];
}

/** Shift a ball-side player toward weak side. */
export function relieveBallSideOverload(
  ballHandler: DesignerObject,
  sameSide: DesignerObject[],
): DesignerCoachFix[] {
  if (!sameSide.length) return [];
  const mover = [...sameSide].sort(
    (left, right) =>
      Math.abs(right.x - ballHandler.x) - Math.abs(left.x - ballHandler.x),
  )[0];
  if (!mover) return [];

  const weakX = ballHandler.x >= 0.5 ? 0.22 : 0.78;
  return [
    {
      type: "move",
      objectId: mover.id,
      x: clampNorm(weakX),
      y: clampNorm(mover.y),
    },
  ];
}

const DEFENSE_HELP_SLOTS = [
  { x: 0.5, y: 0.42 },
  { x: 0.18, y: 0.32 },
  { x: 0.82, y: 0.32 },
  { x: 0.22, y: 0.52 },
  { x: 0.78, y: 0.52 },
] as const;

function defenseSlotOpen(
  objects: DesignerObject[],
  x: number,
  y: number,
  minDist = 0.08,
) {
  return !objects.some(
    (object) =>
      object.kind === "defense" &&
      Math.hypot(object.x - x, object.y - y) < minDist,
  );
}

export function coachDefenseObjectId(key: string, slot = 0) {
  return `coach-${key}-${slot}`;
}

export function guardRotationToward(
  target: DesignerObject,
  defender: DesignerObject,
): number {
  const deg =
    (Math.atan2(target.x - defender.x, defender.y - target.y) * 180) /
    Math.PI;
  return ((deg % 360) + 360) % 360;
}

/** Add help defenders at open shell slots. */
export function addHelpDefenderFixes(
  frame: DesignerFrame,
  count: number,
  keyPrefix: string,
  rosterMode: DesignerRosterMode = "play",
): DesignerCoachFix[] {
  const fixes: DesignerCoachFix[] = [];
  let objects = frame.objects;

  for (const slot of DEFENSE_HELP_SLOTS) {
    if (fixes.length >= count) break;
    if (!defenseSlotOpen(objects, slot.x, slot.y)) continue;
    const label = nextAvailableJersey(objects, "defense", rosterMode);
    if (!label) break;

    const objectId = coachDefenseObjectId(keyPrefix, fixes.length);
    fixes.push({
      type: "addDefense",
      objectId,
      x: clampNorm(slot.x),
      y: clampNorm(slot.y),
      label,
      defenseStyle: "mark",
    });
    objects = [
      ...objects,
      {
        id: objectId,
        kind: "defense",
        x: slot.x,
        y: slot.y,
        label,
        defenseStyle: "mark" as const,
      },
    ];
  }

  return fixes;
}

/** Tag the ball-screen screener with a mark defender. */
export function tagScreenerDefenderFixes(
  frame: DesignerFrame,
  screen: DesignerAction,
  keyPrefix: string,
  rosterMode: DesignerRosterMode = "play",
): DesignerCoachFix[] {
  const x = clampNorm(screen.x2);
  const y = clampNorm(screen.y2);
  const nearby = frame.objects.find(
    (object) =>
      object.kind === "defense" && Math.hypot(object.x - x, object.y - y) < 0.1,
  );
  if (nearby) {
    return [{ type: "move", objectId: nearby.id, x, y }];
  }

  const label = nextAvailableJersey(frame.objects, "defense", rosterMode);
  if (!label) return [];

  return [
    {
      type: "addDefense",
      objectId: coachDefenseObjectId(keyPrefix),
      x,
      y,
      label,
      defenseStyle: "mark",
    },
  ];
}

/** Put guard on the ball and demote extra guards to mark. */
export function alignOnBallGuardFixes(frame: DesignerFrame): DesignerCoachFix[] {
  const offense = frame.objects.filter((object) => object.kind === "offense");
  const defense = frame.objects.filter((object) => object.kind === "defense");
  const ballHandler =
    offense.find((player) => player.hasBall) ?? offense[0];
  if (!ballHandler || defense.length < 2) return [];

  const onBall = [...defense].sort(
    (left, right) =>
      Math.hypot(left.x - ballHandler.x, left.y - ballHandler.y) -
      Math.hypot(right.x - ballHandler.x, right.y - ballHandler.y),
  )[0];
  if (!onBall) return [];

  const fixes: DesignerCoachFix[] = [];
  if (onBall.defenseStyle !== "guard") {
    fixes.push({
      type: "setDefenseStyle",
      objectId: onBall.id,
      defenseStyle: "guard",
      rotation: guardRotationToward(ballHandler, onBall),
    });
  }

  for (const defender of defense) {
    if (defender.id === onBall.id) continue;
    if (defender.defenseStyle === "guard") {
      fixes.push({
        type: "setDefenseStyle",
        objectId: defender.id,
        defenseStyle: "mark",
      });
    }
  }

  return fixes;
}
