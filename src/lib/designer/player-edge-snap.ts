import { findClosestActionLineEndpoint } from "@/lib/designer/line-chain-snap";
import { lineSnapRadiusNorm, screenLineSnapRadiusNorm } from "@/lib/designer/player-ball-ring";
import { closestPlayer, PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import type { ActionType, DesignerAction, DesignerObject } from "@/types/designer";

export function snapCourtWidthRef(courtType: "half" | "full") {
  return courtType === "full" ? 960 : 680;
}

function effectiveBallHolderPosition(
  ballHolder: DesignerObject,
  actions: DesignerAction[],
) {
  let pos = { x: ballHolder.x, y: ballHolder.y };
  for (const action of actions) {
    if (action.type !== "dribble") continue;
    const nearStart =
      Math.hypot(pos.x - action.x1, pos.y - action.y1) < PLAYER_SNAP_NORM * 3;
    if (nearStart) {
      pos = { x: action.x2, y: action.y2 };
    }
  }
  return pos;
}

function offenseScreeners(objects: DesignerObject[], ballHolderId?: string) {
  return objects.filter(
    (o) => o.kind === "offense" && o.id !== ballHolderId,
  );
}

function explicitBallHolders(objects: DesignerObject[]) {
  return objects.filter((o) => o.kind === "offense" && o.hasBall);
}

function closestBallHolderAt(
  x: number,
  y: number,
  objects: DesignerObject[],
  maxDist = PLAYER_SNAP_NORM * 2.5,
) {
  const holders = explicitBallHolders(objects);
  if (!holders.length) return null;
  if (holders.length === 1) return holders[0]!;
  let best: DesignerObject | null = null;
  let bestDist = maxDist;
  for (const holder of holders) {
    const d = Math.hypot(holder.x - x, holder.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = holder;
    }
  }
  return best;
}

export function resolvePassStartPlayer(
  x1: number,
  y1: number,
  objects: DesignerObject[],
  maxDist = PLAYER_SNAP_NORM * 2.5,
) {
  const holders = explicitBallHolders(objects);
  if (holders.length > 1) {
    return (
      closestBallHolderAt(x1, y1, objects, maxDist) ??
      closestPlayer(x1, y1, objects, [], maxDist)
    );
  }
  if (holders.length === 1) return holders[0]!;
  return closestPlayer(x1, y1, objects, [], maxDist);
}

function nearestScreenerDistance(
  x: number,
  y: number,
  screeners: DesignerObject[],
) {
  let best = Infinity;
  for (const screener of screeners) {
    best = Math.min(best, Math.hypot(x - screener.x, y - screener.y));
  }
  return best;
}

function closestScreener(
  x: number,
  y: number,
  screeners: DesignerObject[],
) {
  let best: DesignerObject | null = null;
  let bestDist = Infinity;
  for (const screener of screeners) {
    const dist = Math.hypot(x - screener.x, y - screener.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = screener;
    }
  }
  return best;
}

function isNearScreener(
  x: number,
  y: number,
  screeners: DesignerObject[],
  snapDist: number,
) {
  return nearestScreenerDistance(x, y, screeners) <= snapDist;
}

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

function snapBallHolderDrawStart(
  x: number,
  y: number,
  towardX: number,
  towardY: number,
  objects: DesignerObject[],
  courtWidthPx?: number,
  maxDist = PLAYER_SNAP_NORM * 2.5,
) {
  const ballHolder = resolvePassStartPlayer(x, y, objects, maxDist);
  if (!ballHolder?.hasBall) return null;
  if (Math.hypot(ballHolder.x - x, ballHolder.y - y) > maxDist) return null;
  return getPlayerEdgePoint(
    ballHolder.x,
    ballHolder.y,
    towardX,
    towardY,
    lineSnapRadiusNorm(ballHolder, courtWidthPx),
  );
}

function snapScreenStartFromPlayer(
  sx: number,
  sy: number,
  towardX: number,
  towardY: number,
  player: DesignerObject,
  courtWidthPx?: number,
) {
  const snapR = screenLineSnapRadiusNorm(player, courtWidthPx);
  const d = Math.hypot(sx - player.x, sy - player.y);
  if (d > snapR * 1.15) return null;
  return getPlayerEdgePoint(player.x, player.y, towardX, towardY, snapR);
}

export function snapPointToPlayerEdge(
  x: number,
  y: number,
  towardX: number,
  towardY: number,
  objects: DesignerObject[],
  excludeIds: string[] = [],
  courtWidthPx?: number,
) {
  const snapDist = PLAYER_SNAP_NORM * 2.5;
  const player = closestPlayer(x, y, objects, excludeIds, snapDist);
  if (!player) return { x, y, playerId: null as string | null };
  const edge = getPlayerEdgePoint(
    player.x,
    player.y,
    towardX,
    towardY,
    lineSnapRadiusNorm(player, courtWidthPx),
  );
  return { x: edge.x, y: edge.y, playerId: player.id };
}

/** Snap dribble/handoff draw start to ball ring edge (or action chain end). */
export function resolveLineDrawStart(
  x: number,
  y: number,
  objects: DesignerObject[],
  actions: DesignerAction[],
  actionType: ActionType | string,
  courtWidthPx?: number,
) {
  const chainTypes =
    actionType === "pass"
      ? (["dribble", "pass"] as const)
      : (["dribble", "cut", "curl", "pass"] as const);
  const chain = findClosestActionLineEndpoint(x, y, actions, {
    types: [...chainTypes],
  });
  if (chain) return { x: chain.x, y: chain.y };

  if (actionType === "dribble") {
    const ballHolder = resolvePassStartPlayer(x, y, objects);
    if (ballHolder?.hasBall) {
      const edge = getPlayerEdgePoint(
        ballHolder.x,
        ballHolder.y,
        x,
        y,
        lineSnapRadiusNorm(ballHolder, courtWidthPx),
      );
      return { x: edge.x, y: edge.y };
    }
    const snap = snapPointToPlayerEdge(
      x,
      y,
      x + 0.05,
      y,
      objects,
      [],
      courtWidthPx,
    );
    return snap.playerId ? { x: snap.x, y: snap.y } : { x, y };
  }

  if (actionType === "handoff") {
    const ballHolder = objects.find((o) => o.kind === "offense" && o.hasBall);
    if (ballHolder) {
      const ballPos = effectiveBallHolderPosition(ballHolder, actions);
      const edge = getPlayerEdgePoint(
        ballPos.x,
        ballPos.y,
        x,
        y,
        lineSnapRadiusNorm(ballHolder, courtWidthPx),
      );
      return { x: edge.x, y: edge.y };
    }
    const snap = snapPointToPlayerEdge(
      x,
      y,
      x + 0.05,
      y,
      objects,
      [],
      courtWidthPx,
    );
    return snap.playerId ? { x: snap.x, y: snap.y } : { x, y };
  }

  if (actionType === "pass") {
    const startPlayer = resolvePassStartPlayer(x, y, objects);
    if (startPlayer?.hasBall) {
      const edge = getPlayerEdgePoint(
        startPlayer.x,
        startPlayer.y,
        x + 0.05,
        y,
        lineSnapRadiusNorm(startPlayer, courtWidthPx),
      );
      return { x: edge.x, y: edge.y };
    }
    const snap = snapPointToPlayerEdge(
      x,
      y,
      x + 0.05,
      y,
      objects,
      [],
      courtWidthPx,
    );
    return snap.playerId ? { x: snap.x, y: snap.y } : { x, y };
  }

  if (
    actionType === "cut" ||
    actionType === "curl" ||
    actionType === "screen"
  ) {
    if (actionType === "screen") {
      const ballHolder = objects.find((o) => o.kind === "offense" && o.hasBall);
      if (ballHolder) {
        const edge = snapScreenStartFromPlayer(
          x,
          y,
          x + 0.05,
          y,
          ballHolder,
          courtWidthPx,
        );
        if (edge) return edge;
      }
      const screener = closestPlayer(
        x,
        y,
        objects.filter((o) => o.kind === "offense" && o.id !== ballHolder?.id),
        [],
        PLAYER_SNAP_NORM * 2.5,
      );
      if (screener) {
        const edge = snapScreenStartFromPlayer(
          x,
          y,
          x + 0.05,
          y,
          screener,
          courtWidthPx,
        );
        if (edge) return edge;
      }
      return { x, y };
    }
    const ballEdge = snapBallHolderDrawStart(
      x,
      y,
      x + 0.05,
      y,
      objects,
      courtWidthPx,
    );
    if (ballEdge) return ballEdge;
    const snap = snapPointToPlayerEdge(
      x,
      y,
      x + 0.05,
      y,
      objects,
      [],
      courtWidthPx,
    );
    return snap.playerId ? { x: snap.x, y: snap.y } : { x, y };
  }

  return { x, y };
}

/** Snap cut/curl start to mover edge; end stays as drawn destination. */
export function snapCutEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  courtWidthPx?: number,
) {
  const chain = findClosestActionLineEndpoint(x1, y1, actions, {
    types: ["dribble", "cut", "curl", "pass"],
  });
  if (chain) {
    return { x1: chain.x, y1: chain.y, x2, y2 };
  }

  const startSnap = snapPointToPlayerEdge(x1, y1, x2, y2, objects, [], courtWidthPx);
  return {
    x1: startSnap.playerId ? startSnap.x : x1,
    y1: startSnap.playerId ? startSnap.y : y1,
    x2,
    y2,
  };
}

/** Snap pass: start from ball handler edge (or chain), end at receiver edge. */
export function snapPassEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  courtWidthPx?: number,
) {
  const startPlayer = resolvePassStartPlayer(x1, y1, objects);
  const chain = findClosestActionLineEndpoint(x1, y1, actions, {
    types: ["dribble", "cut", "curl", "pass"],
  });

  let sx = x1;
  let sy = y1;

  if (chain) {
    sx = chain.x;
    sy = chain.y;
  } else if (startPlayer?.hasBall) {
    const edge = getPlayerEdgePoint(
      startPlayer.x,
      startPlayer.y,
      x2,
      y2,
      lineSnapRadiusNorm(startPlayer, courtWidthPx),
    );
    sx = edge.x;
    sy = edge.y;
  } else {
    const startSnap = snapPointToPlayerEdge(sx, sy, x2, y2, objects, [], courtWidthPx);
    sx = startSnap.playerId ? startSnap.x : sx;
    sy = startSnap.playerId ? startSnap.y : sy;
  }

  const exclude = startPlayer
    ? [startPlayer.id]
    : (() => {
        const anchor = closestPlayer(
          sx,
          sy,
          objects,
          [],
          PLAYER_SNAP_NORM * 2,
        );
        return anchor ? [anchor.id] : [];
      })();
  const endSnap = snapPointToPlayerEdge(x2, y2, sx, sy, objects, exclude, courtWidthPx);
  return {
    x1: sx,
    y1: sy,
    x2: endSnap.playerId ? endSnap.x : x2,
    y2: endSnap.playerId ? endSnap.y : y2,
  };
}

/** Snap screen: screener edge at x1, screening spot (T-bar) at x2. */
export function snapScreenEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  courtWidthPx?: number,
) {
  const ballHolder = objects.find((o) => o.kind === "offense" && o.hasBall);
  const exclude = ballHolder ? [ballHolder.id] : [];
  const screeners = offenseScreeners(objects, ballHolder?.id);

  let sx = x1;
  let sy = y1;
  let ex = x2;
  let ey = y2;

  const screenerSnapDist = PLAYER_SNAP_NORM * 2.5;

  if (ballHolder) {
    const ballEdge = snapScreenStartFromPlayer(
      sx,
      sy,
      ex,
      ey,
      ballHolder,
      courtWidthPx,
    );
    if (ballEdge) {
      sx = ballEdge.x;
      sy = ballEdge.y;
    }
  }

  const anchoredAtDribbleEnd = actions.some(
    (action) =>
      action.type === "dribble" &&
      Math.hypot(action.x2 - sx, action.y2 - sy) < PLAYER_SNAP_NORM * 2,
  );

  if (anchoredAtDribbleEnd && screeners.length === 1) {
    const screener = screeners[0]!;
    const edge =
      snapScreenStartFromPlayer(sx, sy, ex, ey, screener, courtWidthPx) ??
      getPlayerEdgePoint(
        screener.x,
        screener.y,
        ex,
        ey,
        screenLineSnapRadiusNorm(screener, courtWidthPx),
      );
    return { x1: edge.x, y1: edge.y, x2: ex, y2: ey };
  }

  const startNearScreener = isNearScreener(sx, sy, screeners, screenerSnapDist);
  const endNearScreener = isNearScreener(ex, ey, screeners, screenerSnapDist);

  // Only flip when the draw clearly ended on a screener, not from open-court distance heuristics.
  if (endNearScreener && !startNearScreener) {
    sx = x2;
    sy = y2;
    ex = x1;
    ey = y1;
  }

  const anchorNearScreener = isNearScreener(sx, sy, screeners, screenerSnapDist);
  if (anchorNearScreener && screeners.length >= 1) {
    const screener = closestScreener(sx, sy, screeners)!;
    const edge =
      snapScreenStartFromPlayer(sx, sy, ex, ey, screener, courtWidthPx) ??
      getPlayerEdgePoint(
        screener.x,
        screener.y,
        ex,
        ey,
        screenLineSnapRadiusNorm(screener, courtWidthPx),
      );
    return { x1: edge.x, y1: edge.y, x2: ex, y2: ey };
  }

  const startSnap = snapPointToPlayerEdge(sx, sy, ex, ey, objects, exclude, courtWidthPx);
  if (startSnap.playerId) {
    const player = objects.find((o) => o.id === startSnap.playerId);
    if (player?.kind === "offense") {
      const edge = getPlayerEdgePoint(
        player.x,
        player.y,
        ex,
        ey,
        screenLineSnapRadiusNorm(player, courtWidthPx),
      );
      return { x1: edge.x, y1: edge.y, x2: ex, y2: ey };
    }
  }
  return {
    x1: startSnap.playerId ? startSnap.x : sx,
    y1: startSnap.playerId ? startSnap.y : sy,
    x2: ex,
    y2: ey,
  };
}

/** Snap dribble start to ball handler edge or prior action chain end. */
export function snapDribbleEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  courtWidthPx?: number,
) {
  const chain = findClosestActionLineEndpoint(x1, y1, actions, {
    types: ["dribble", "cut", "curl", "pass"],
  });
  if (chain) {
    return { x1: chain.x, y1: chain.y, x2, y2 };
  }

  const ballHolder = resolvePassStartPlayer(x1, y1, objects);
  if (ballHolder?.hasBall) {
    const edge = getPlayerEdgePoint(
      ballHolder.x,
      ballHolder.y,
      x2,
      y2,
      lineSnapRadiusNorm(ballHolder, courtWidthPx),
    );
    return { x1: edge.x, y1: edge.y, x2, y2 };
  }

  const startSnap = snapPointToPlayerEdge(x1, y1, x2, y2, objects, [], courtWidthPx);
  return {
    x1: startSnap.playerId ? startSnap.x : x1,
    y1: startSnap.playerId ? startSnap.y : y1,
    x2,
    y2,
  };
}

/** Snap hand-off: giver = ball handler, meeting = line end (taker edge when possible). */
export function snapHandoffEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  objects: DesignerObject[],
  actions: DesignerAction[] = [],
  courtWidthPx?: number,
) {
  let sx = x1;
  let sy = y1;
  let ex = x2;
  let ey = y2;

  const ballHolder = objects.find((o) => o.kind === "offense" && o.hasBall);
  if (ballHolder) {
    const ballPos = effectiveBallHolderPosition(ballHolder, actions);
    const dStart = Math.hypot(ballPos.x - sx, ballPos.y - sy);
    const dEnd = Math.hypot(ballPos.x - ex, ballPos.y - ey);
    if (dEnd < dStart && dEnd < PLAYER_SNAP_NORM * 0.25) {
      sx = x2;
      sy = y2;
      ex = x1;
      ey = y1;
    }

    const chain = findClosestActionLineEndpoint(sx, sy, actions, {
      types: ["dribble", "cut", "curl", "pass"],
    });
    if (chain) {
      sx = chain.x;
      sy = chain.y;
    } else {
      const giverEdge = getPlayerEdgePoint(
        ballPos.x,
        ballPos.y,
        ex,
        ey,
        lineSnapRadiusNorm(ballHolder, courtWidthPx),
      );
      sx = giverEdge.x;
      sy = giverEdge.y;
    }

    const takerSnap = snapPointToPlayerEdge(ex, ey, sx, sy, objects, [
      ballHolder.id,
    ], courtWidthPx);
    return {
      x1: sx,
      y1: sy,
      x2: takerSnap.playerId ? takerSnap.x : ex,
      y2: takerSnap.playerId ? takerSnap.y : ey,
    };
  }

  const startSnap = snapPointToPlayerEdge(sx, sy, ex, ey, objects, [], courtWidthPx);
  sx = startSnap.playerId ? startSnap.x : sx;
  sy = startSnap.playerId ? startSnap.y : sy;
  const exclude = startSnap.playerId ? [startSnap.playerId] : [];
  const endSnap = snapPointToPlayerEdge(ex, ey, sx, sy, objects, exclude, courtWidthPx);
  return {
    x1: sx,
    y1: sy,
    x2: endSnap.playerId ? endSnap.x : ex,
    y2: endSnap.playerId ? endSnap.y : ey,
  };
}
