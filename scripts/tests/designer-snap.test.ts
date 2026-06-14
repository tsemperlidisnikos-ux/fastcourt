import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findClosestActionLineEndpoint } from "@/lib/designer/line-chain-snap";
import { closestPlayer, PLAYER_SNAP_NORM } from "@/lib/designer/player-snap";
import { lineSnapRadiusNorm } from "@/lib/designer/player-ball-ring";
import { snapPassEndpoints } from "@/lib/designer/player-edge-snap";
import { defense, makeAction, offense } from "./helpers";

describe("player snap", () => {
  it("closestPlayer finds nearest offense within snap distance", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.5),
      offense("o2", "2", 0.8, 0.8),
    ];
    const hit = closestPlayer(0.52, 0.48, objects, [], PLAYER_SNAP_NORM);
    assert.equal(hit?.id, "o1");
  });

  it("closestPlayer excludes listed ids", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.5),
      offense("o2", "2", 0.52, 0.48),
    ];
    const hit = closestPlayer(0.51, 0.49, objects, ["o1"], PLAYER_SNAP_NORM);
    assert.equal(hit?.id, "o2");
  });

  it("closestPlayer ignores non-roster kinds", () => {
    const objects = [defense("d1", "x1", 0.5, 0.5)];
    const hit = closestPlayer(0.5, 0.5, objects);
    assert.equal(hit?.id, "d1");
  });
});

describe("pass endpoint snap", () => {
  it("snapPassEndpoints aligns pass to player edges", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6),
      offense("o2", "2", 0.3, 0.4),
    ];
    const snapped = snapPassEndpoints(0.48, 0.58, 0.32, 0.42, objects);
    const passer = closestPlayer(snapped.x1, snapped.y1, objects, [], PLAYER_SNAP_NORM * 2);
    const receiver = closestPlayer(
      snapped.x2,
      snapped.y2,
      objects,
      [passer?.id ?? ""],
      PLAYER_SNAP_NORM * 2,
    );
    assert.equal(passer?.label, "1");
    assert.equal(receiver?.label, "2");
  });

  it("pass start snaps outside ball ring for ball holder", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6, true),
      offense("o2", "2", 0.3, 0.4),
    ];
    const snapped = snapPassEndpoints(0.5, 0.6, 0.3, 0.4, objects);
    const dist = Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.6);
    const tokenOnly = lineSnapRadiusNorm(
      offense("o1", "1", 0.5, 0.6, false),
    );
    const ballRing = lineSnapRadiusNorm(objects[0]);
    assert.ok(dist > tokenOnly);
    assert.ok(Math.abs(dist - ballRing) < 0.008);
  });

  it("pass chains from dribble endpoint when near", () => {
    const dribble = makeAction("dribble", 0.5, 0.7, 0.65, 0.55, "d1");
    const objects = [
      offense("o1", "1", 0.5, 0.7, true),
      offense("o2", "2", 0.25, 0.4),
    ];
    const snapped = snapPassEndpoints(0.64, 0.56, 0.26, 0.41, objects, [dribble]);
    assert.ok(Math.hypot(snapped.x1 - 0.65, snapped.y1 - 0.55) < 0.02);
  });
});

describe("line chain snap", () => {
  it("findClosestActionLineEndpoint returns dribble end", () => {
    const dribble = makeAction("dribble", 0.5, 0.7, 0.65, 0.55, "d1");
    const hit = findClosestActionLineEndpoint(0.66, 0.54, [dribble], {
      types: ["dribble"],
    });
    assert.ok(hit);
    assert.equal(hit.actionId, "d1");
    assert.ok(Math.hypot(hit.x - 0.65, hit.y - 0.55) < 0.01);
  });
});
