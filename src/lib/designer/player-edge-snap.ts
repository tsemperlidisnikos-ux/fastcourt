import { findClosestActionLineEndpoint } from "@/lib/designer/line-chain-snap";
import { lineSnapRadiusNorm } from "@/lib/designer/player-ball-ring";
import { closestPlayer, PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import type { DesignerAction, DesignerObject } from "@/types/designer";

export function getPlayerEdgePoint(
  px: number,
  py: number,
  towardX: number,
  towardY: number,
  snapRadiusNorm: number,
) {
  const dx = towardX - px;
  const dy = towardY - py;
  const len = Math.hypot(dx, dy);
  const r = snapRadiusNorm;
  if (len < 1e-6) return { x: px + r, y: py };
  return { x: px + (dx / len) * r, y: py + (dy / len) * r };
}

export function snapPointToPlayerEdge(
  x: number,
  y: number,
  towardX: number,
  towardY: number,
  objects: DesignerObject[],
  excludeIds: string[] = [],
) {
  const snapDist = PLAYER_SNAP_NORM * 2.5;
  const player = closestPlayer(x, y, objects, excludeIds, snapDist);
  if (!player) return { x, y, playerId: null as string | null };
  const edge = getPlayerEdgePoint(
    player.x,
    player.y,
    towardX,
    towardY,
    lineSnapRadiusNorm(player),
  );
  return { x: edge.x, y: edge.y, playerId: player.id };
}

/** Snap pass line endpoints to player edges (legacy fastdraw behavior). */
export function snapPassEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
) {
  const chain = findClosestActionLineEndpoint(x1, y1, actions, {
    types: ["dribble"],
  });
  if (chain) {
    const sx = chain.x;
    const sy = chain.y;
    const dribble = actions.find((a) => a.id === chain.actionId);
    let exclude: string[] = [];
    if (dribble) {
      const passer = closestPlayer(
        dribble.x1,
        dribble.y1,
        objects,
        [],
        PLAYER_SNAP_NORM * 2,
      );
      if (passer) exclude = [passer.id];
    }
    const endSnap = snapPointToPlayerEdge(x2, y2, sx, sy, objects, exclude);
    return {
      x1: sx,
      y1: sy,
      x2: endSnap.playerId ? endSnap.x : x2,
      y2: endSnap.playerId ? endSnap.y : y2,
    };
  }

  const startSnap = snapPointToPlayerEdge(x1, y1, x2, y2, objects);
  const sx = startSnap.playerId ? startSnap.x : x1;
  const sy = startSnap.playerId ? startSnap.y : y1;
  const exclude = startSnap.playerId ? [startSnap.playerId] : [];
  const endSnap = snapPointToPlayerEdge(x2, y2, sx, sy, objects, exclude);
  return {
    x1: sx,
    y1: sy,
    x2: endSnap.playerId ? endSnap.x : x2,
    y2: endSnap.playerId ? endSnap.y : y2,
  };
}
