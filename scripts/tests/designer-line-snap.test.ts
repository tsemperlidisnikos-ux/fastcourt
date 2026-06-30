import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { snapCutEndpoints, snapDribbleEndpoints, snapHandoffEndpoints, snapPassEndpoints, snapScreenEndpoints, resolveLineDrawStart } from "@/lib/designer/player-edge-snap";
import { lineSnapRadiusNorm } from "@/lib/designer/player-ball-ring";
import { makeAction, offense } from "./helpers";

describe("cut line snap", () => {
  it("snaps start to nearest player edge", () => {
    const objects = [offense("o1", "1", 0.5, 0.7)];
    const snapped = snapCutEndpoints(0.5, 0.7, 0.6, 0.4, objects);
    assert.notEqual(snapped.x1, 0.5);
    assert.notEqual(snapped.y1, 0.7);
    assert.equal(snapped.x2, 0.6);
    assert.equal(snapped.y2, 0.4);
  });

  it("cut from ball holder starts outside ring with visible gap", () => {
    const objects = [offense("o1", "1", 0.5, 0.7, true)];
    const snapped = snapCutEndpoints(0.5, 0.7, 0.6, 0.4, objects, [], 680);
    const dist = Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.7);
    const ringOnly =
      lineSnapRadiusNorm(objects[0], 680) - 9 / 680;
    assert.ok(dist > ringOnly);
  });

  it("chains start to prior dribble end", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
    ];
    const actions = [makeAction("dribble", 0.2, 0.75, 0.45, 0.55, "d1")];
    const snapped = snapCutEndpoints(0.44, 0.55, 0.5, 0.4, objects, actions);
    assert.ok(Math.abs(snapped.x1 - 0.45) < 0.01);
    assert.ok(Math.abs(snapped.y1 - 0.55) < 0.01);
  });

  it("chains start to prior pass end", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
    ];
    const actions = [makeAction("pass", 0.2, 0.75, 0.78, 0.75, "p1")];
    const snapped = snapCutEndpoints(0.77, 0.75, 0.5, 0.5, objects, actions);
    assert.ok(Math.abs(snapped.x1 - 0.78) < 0.02);
    assert.ok(Math.abs(snapped.y1 - 0.75) < 0.02);
  });
});

describe("curl line snap", () => {
  it("shares cut snap — chains from prior curl end", () => {
    const objects = [offense("o1", "1", 0.5, 0.7)];
    const actions = [makeAction("curl", 0.5, 0.7, 0.6, 0.5, "cu1")];
    const snapped = snapCutEndpoints(0.59, 0.5, 0.7, 0.4, objects, actions);
    assert.ok(Math.abs(snapped.x1 - 0.6) < 0.02);
    assert.ok(Math.abs(snapped.y1 - 0.5) < 0.02);
  });
});

describe("pass line snap", () => {
  it("snaps start to ball handler edge toward receiver", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6, true),
      offense("o2", "2", 0.3, 0.4),
    ];
    const snapped = snapPassEndpoints(0.5, 0.6, 0.3, 0.4, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.6) > 0.01);
  });
});

describe("dribble line snap", () => {
  it("snaps start to ball handler edge", () => {
    const objects = [offense("o1", "1", 0.5, 0.7, true)];
    const snapped = snapDribbleEndpoints(0.5, 0.7, 0.65, 0.55, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.7) > 0.01);
    assert.equal(snapped.x2, 0.65);
    assert.equal(snapped.y2, 0.55);
  });

  it("resolveLineDrawStart snaps to ball ring edge before draw", () => {
    const objects = [offense("o1", "1", 0.5, 0.7, true)];
    const start = resolveLineDrawStart(0.8, 0.4, objects, [], "dribble", 680);
    assert.ok(Math.hypot(start.x - 0.5, start.y - 0.7) > 0.01);
    assert.ok(Math.hypot(start.x - 0.5, start.y - 0.7) < 0.08);
  });

  it("chains second dribble from first dribble end", () => {
    const objects = [offense("o1", "1", 0.5, 0.7, true)];
    const actions = [makeAction("dribble", 0.5, 0.7, 0.65, 0.55, "d1")];
    const snapped = snapDribbleEndpoints(0.64, 0.56, 0.75, 0.45, objects, actions);
    assert.ok(Math.hypot(snapped.x1 - 0.65, snapped.y1 - 0.55) < 0.02);
  });
});

describe("screen line snap", () => {
  it("screen from ball holder starts outside ring with extra gap", () => {
    const objects = [offense("o1", "1", 0.5, 0.7, true)];
    const snapped = snapScreenEndpoints(0.5, 0.7, 0.35, 0.45, objects, [], 520);
    const dist = Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.7);
    const ringOnly =
      lineSnapRadiusNorm(objects[0], 520) -
      (14 + 2.5 + 8) / 520;
    assert.ok(dist > ringOnly);
  });

  it("snaps screener edge with screening spot at drawn end", () => {
    const objects = [
      offense("o1", "1", 0.82, 0.72),
      offense("o2", "2", 0.18, 0.72, true),
    ];
    const snapped = snapScreenEndpoints(0.82, 0.72, 0.38, 0.55, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.82, snapped.y1 - 0.72) > 0.01);
    assert.equal(snapped.x2, 0.38);
    assert.equal(snapped.y2, 0.55);
  });

  it("fixes screen drawn from dribble end to screener edge", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.8, 0.75),
    ];
    const dribble = makeAction("dribble", 0.2, 0.75, 0.45, 0.45, "d1");
    const snapped = snapScreenEndpoints(0.45, 0.45, 0.38, 0.55, objects, [dribble]);
    assert.ok(Math.hypot(snapped.x1 - 0.45, snapped.y1 - 0.45) > 0.02);
    assert.ok(Math.hypot(snapped.x1 - 0.8, snapped.y1 - 0.75) < 0.08);
    assert.equal(snapped.x2, 0.38);
    assert.equal(snapped.y2, 0.55);
  });

  it("normalizes backwards screen draw", () => {
    const objects = [
      offense("o1", "1", 0.82, 0.72),
      offense("o2", "2", 0.18, 0.72, true),
    ];
    const snapped = snapScreenEndpoints(0.38, 0.55, 0.82, 0.72, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.82, snapped.y1 - 0.72) > 0.01);
    assert.equal(snapped.x2, 0.38);
    assert.equal(snapped.y2, 0.55);
  });

  it("keeps forward draw when screener is nearer ball than screening spot", () => {
    const objects = [
      offense("o1", "1", 0.48, 0.48),
      offense("o2", "2", 0.5, 0.5, true),
    ];
    const snapped = snapScreenEndpoints(0.48, 0.48, 0.25, 0.25, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.48, snapped.y1 - 0.48) > 0.01);
    assert.equal(snapped.x2, 0.25);
    assert.equal(snapped.y2, 0.25);
  });

  it("keeps draw direction with multiple screeners even when start is nearer ball", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.2, true),
      offense("o2", "2", 0.3, 0.5),
      offense("o3", "3", 0.7, 0.5),
    ];
    const snapped = snapScreenEndpoints(0.3, 0.5, 0.15, 0.5, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.3, snapped.y1 - 0.5) > 0.01);
    assert.equal(snapped.x2, 0.15);
    assert.equal(snapped.y2, 0.5);
  });

  it("keeps open-court draw direction when neither endpoint is on a screener", () => {
    const objects = [
      offense("o1", "1", 0.82, 0.72),
      offense("o2", "2", 0.18, 0.72, true),
    ];
    const snapped = snapScreenEndpoints(0.35, 0.4, 0.55, 0.35, objects);
    assert.equal(snapped.x1, 0.35);
    assert.equal(snapped.y1, 0.4);
    assert.equal(snapped.x2, 0.55);
    assert.equal(snapped.y2, 0.35);
  });
});

describe("handoff line snap", () => {
  it("resolveLineDrawStart snaps giver to ball ring edge", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6, true),
      offense("o2", "2", 0.4, 0.5),
    ];
    const start = resolveLineDrawStart(0.45, 0.55, objects, [], "handoff", 680);
    assert.ok(Math.hypot(start.x - 0.5, start.y - 0.6) > 0.01);
    assert.ok(Math.hypot(start.x - 0.5, start.y - 0.6) < 0.08);
  });

  it("snaps giver to ball handler edge toward meeting point", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6, true),
      offense("o2", "2", 0.4, 0.5),
    ];
    const snapped = snapHandoffEndpoints(0.5, 0.6, 0.45, 0.55, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.6) > 0.01);
    assert.ok(Math.abs(snapped.x2 - 0.45) < 0.03);
    assert.ok(Math.abs(snapped.y2 - 0.55) < 0.03);
  });

  it("chains start from prior dribble end", () => {
    const objects = [
      offense("o1", "1", 0.2, 0.75, true),
      offense("o2", "2", 0.35, 0.6),
    ];
    const actions = [makeAction("dribble", 0.2, 0.75, 0.4, 0.55, "d1")];
    const snapped = snapHandoffEndpoints(0.39, 0.55, 0.42, 0.58, objects, actions);
    assert.ok(Math.abs(snapped.x1 - 0.4) < 0.02);
    assert.ok(Math.abs(snapped.y1 - 0.55) < 0.02);
    assert.ok(Math.hypot(snapped.x2 - 0.35, snapped.y2 - 0.6) > 0.01);
    assert.ok(Math.hypot(snapped.x2 - 0.35, snapped.y2 - 0.6) < 0.08);
  });

  it("keeps meeting at drawn end when draw starts near taker", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.6, true),
      offense("o2", "2", 0.4, 0.5),
    ];
    const snapped = snapHandoffEndpoints(0.4, 0.5, 0.45, 0.55, objects);
    assert.ok(Math.hypot(snapped.x1 - 0.5, snapped.y1 - 0.6) > 0.01);
    assert.ok(Math.abs(snapped.x2 - 0.45) < 0.03);
    assert.ok(Math.abs(snapped.y2 - 0.55) < 0.03);
  });
});
