import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyActionResultsToFrame, objectsAfterFrameActions } from "@/lib/designer/frame-propagation";
import { resolvePassStartPlayer, snapPassEndpoints } from "@/lib/designer/player-edge-snap";
import {
  ballHolderLabel,
  ballHolderLabels,
  defense,
  makeAction,
  makeFrame,
  makeTargetFrame,
  offense,
} from "./helpers";

describe("frame propagation — ball transfer", () => {
  it("pass moves hasBall to receiver on next frame", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.3, 0.4)],
      [makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.3, 0.4),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
  });

  it("pass transfers from ball handler even when start is near other player", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
        offense("o3", "3", 0.5, 0.45),
      ],
      [makeAction("pass", 0.78, 0.75, 0.5, 0.45, "p1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
      offense("t3", "3", 0.5, 0.45),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "3");
  });

  it("second pass in same frame transfers ball again", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.6, true),
        offense("o2", "2", 0.35, 0.45),
        offense("o3", "3", 0.2, 0.35),
      ],
      [
        makeAction("pass", 0.5, 0.6, 0.35, 0.45, "p1"),
        makeAction("pass", 0.35, 0.45, 0.2, 0.35, "p2"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.35, 0.45),
      offense("t3", "3", 0.2, 0.35),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "3");
  });

  it("pass from 1 to 4 keeps balls on other holders in multi-ball drills", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.62, true),
        offense("o2", "2", 0.42, 0.62, true),
        offense("o3", "3", 0.58, 0.62, true),
        offense("o4", "4", 0.5, 0.38),
      ],
      [makeAction("pass", 0.5, 0.62, 0.5, 0.38, "p1")],
    );

    const after = objectsAfterFrameActions(source);
    assert.deepEqual(ballHolderLabels(after), ["2", "3", "4"]);
  });

  it("sequential passes 1→3 and 2→4 preserve unrelated ball holders", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.62, true),
        offense("o2", "2", 0.5, 0.58, true),
        offense("o3", "3", 0.35, 0.38),
        offense("o4", "4", 0.65, 0.38),
      ],
      [
        makeAction("pass", 0.5, 0.62, 0.35, 0.38, "p1"),
        makeAction("pass", 0.5, 0.58, 0.65, 0.38, "p2"),
      ],
    );

    const after = objectsAfterFrameActions(source);
    assert.deepEqual(ballHolderLabels(after), ["3", "4"]);
  });

  it("sync passes 1→3 and 2→4 run from the same starting possession", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.62, true),
        offense("o2", "2", 0.5, 0.58, true),
        offense("o3", "3", 0.35, 0.38),
        offense("o4", "4", 0.65, 0.38),
      ],
      [
        { ...makeAction("pass", 0.5, 0.62, 0.35, 0.38, "p1"), timing: "sync" },
        { ...makeAction("pass", 0.5, 0.58, 0.65, 0.38, "p2"), timing: "sync" },
      ],
    );

    const after = objectsAfterFrameActions(source);
    assert.deepEqual(ballHolderLabels(after), ["3", "4"]);
  });

  it("sync snapped passes from two ball handlers end on both receivers", () => {
    const objects = [
      offense("o1", "1", 0.3, 0.7, true),
      offense("o2", "2", 0.7, 0.7, true),
      offense("o3", "3", 0.3, 0.3),
      offense("o4", "4", 0.7, 0.3),
    ];
    const snap13 = snapPassEndpoints(0.3, 0.7, 0.3, 0.3, objects);
    const snap24 = snapPassEndpoints(0.7, 0.7, 0.7, 0.3, objects);
    const source = makeFrame(objects, [
      {
        ...makeAction("pass", snap13.x1, snap13.y1, snap13.x2, snap13.y2, "p1"),
        timing: "sync",
      },
      {
        ...makeAction("pass", snap24.x1, snap24.y1, snap24.x2, snap24.y2, "p2"),
        timing: "sync",
      },
    ]);

    const after = objectsAfterFrameActions(source);
    assert.deepEqual(ballHolderLabels(after), ["3", "4"]);
  });

  it("sync snapped passes work when ball handlers are stacked vertically", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.62, true),
      offense("o2", "2", 0.5, 0.58, true),
      offense("o3", "3", 0.35, 0.38),
      offense("o4", "4", 0.65, 0.38),
    ];
    const snap13 = snapPassEndpoints(0.5, 0.62, 0.35, 0.38, objects);
    const snap24 = snapPassEndpoints(0.5, 0.58, 0.65, 0.38, objects);
    const source = makeFrame(objects, [
      {
        ...makeAction("pass", snap13.x1, snap13.y1, snap13.x2, snap13.y2, "p1"),
        timing: "sync",
        sourcePlayerId: resolvePassStartPlayer(0.5, 0.62, objects)!.id,
      },
      {
        ...makeAction("pass", snap24.x1, snap24.y1, snap24.x2, snap24.y2, "p2"),
        timing: "sync",
        sourcePlayerId: resolvePassStartPlayer(0.5, 0.58, objects)!.id,
      },
    ]);

    const after = objectsAfterFrameActions(source);
    assert.deepEqual(ballHolderLabels(after), ["3", "4"]);
  });

  it("handoff transfers ball to taker", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.4, 0.5)],
      [makeAction("handoff", 0.5, 0.6, 0.4, 0.5, "h1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.4, 0.5),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
    const giver = result.objects.find((o) => o.label === "1");
    assert.ok(giver);
    assert.ok(Math.abs(giver!.x - 0.4) < 0.01);
    assert.ok(Math.abs(giver!.y - 0.5) < 0.01);
  });

  it("handoff keeps ball holder as giver when start is near both players", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.6, true),
        offense("o2", "2", 0.48, 0.58),
      ],
      [makeAction("handoff", 0.49, 0.59, 0.46, 0.56, "h1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.48, 0.58),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
    const giver = result.objects.find((o) => o.label === "1");
    assert.ok(giver);
    assert.ok(Math.abs(giver!.x - 0.46) < 0.01);
    assert.ok(Math.abs(giver!.y - 0.56) < 0.01);
  });

  it("handoff with reversed draw still transfers ball to taker", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true), offense("o2", "2", 0.4, 0.5)],
      [makeAction("handoff", 0.4, 0.5, 0.45, 0.55, "h1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.4, 0.5),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
    const giver = result.objects.find((o) => o.label === "1");
    assert.ok(giver);
    assert.ok(Math.abs(giver!.x - 0.45) < 0.01);
    assert.ok(Math.abs(giver!.y - 0.55) < 0.01);
  });

  it("handoff transfers ball from holder even when line starts away from them", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.6), offense("o2", "2", 0.4, 0.5, true)],
      [makeAction("handoff", 0.5, 0.6, 0.45, 0.55, "h1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      offense("t2", "2", 0.4, 0.5),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "1");
    const giver = result.objects.find((o) => o.label === "2");
    assert.ok(giver);
    assert.ok(Math.abs(giver!.x - 0.45) < 0.01);
    assert.ok(Math.abs(giver!.y - 0.55) < 0.01);
  });

  it("dribble then handoff moves giver and transfers ball", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.35, 0.6),
      ],
      [
        makeAction("dribble", 0.2, 0.75, 0.4, 0.55, "d1"),
        makeAction("handoff", 0.4, 0.55, 0.42, 0.58, "h1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.35, 0.6),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
    const giver = result.objects.find((o) => o.label === "1");
    assert.ok(giver);
    assert.ok(Math.abs(giver!.x - 0.42) < 0.01);
    assert.ok(Math.abs(giver!.y - 0.58) < 0.01);
  });

  it("shoot removes ball from offense", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.6, true)],
      [makeAction("shoot", 0.5, 0.6, 0.5, 0.2, "s1")],
    );
    const target = makeTargetFrame([offense("t1", "1", 0.5, 0.6)]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), null);
  });
});

describe("frame propagation — player movement", () => {
  it("screen moves screener not ball handler when start is near both", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.4, 0.5),
        offense("o2", "2", 0.45, 0.52, true),
      ],
      [makeAction("screen", 0.43, 0.51, 0.46, 0.53, "sc1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.4, 0.5),
      offense("t2", "2", 0.45, 0.52),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const screener = result.objects.find((o) => o.label === "1");
    const ballHandler = result.objects.find((o) => o.label === "2");
    assert.ok(screener);
    assert.ok(ballHandler);
    assert.ok(Math.abs(screener!.x - 0.46) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.53) < 0.01);
    assert.ok(Math.abs(ballHandler!.x - 0.45) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.52) < 0.01);
  });

  it("screen after dribble moves screener when start chains to dribble end", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
      ],
      [
        makeAction("dribble", 0.2, 0.75, 0.45, 0.45, "d1"),
        makeAction("screen", 0.45, 0.45, 0.38, 0.55, "sc1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const ballHandler = result.objects.find((o) => o.label === "1");
    const screener = result.objects.find((o) => o.label === "2");
    assert.ok(ballHandler);
    assert.ok(screener);
    assert.ok(Math.abs(ballHandler!.x - 0.45) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.45) < 0.01);
    assert.ok(Math.abs(screener!.x - 0.38) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.55) < 0.01);
  });

  it("pick and roll moves both players to their action ends", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
      ],
      [
        makeAction("dribble", 0.2, 0.75, 0.45, 0.45, "d1"),
        makeAction("screen", 0.78, 0.73, 0.38, 0.55, "sc1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const ballHandler = result.objects.find((o) => o.label === "1");
    const screener = result.objects.find((o) => o.label === "2");
    assert.ok(ballHandler);
    assert.ok(screener);
    assert.ok(Math.abs(ballHandler!.x - 0.45) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.45) < 0.01);
    assert.ok(Math.abs(screener!.x - 0.38) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.55) < 0.01);
  });

  it("dribble moves ball handler even when start is near screener", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.82, 0.72),
        offense("o2", "2", 0.18, 0.72, true),
      ],
      [makeAction("dribble", 0.82, 0.72, 0.5, 0.38, "d1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.82, 0.72),
      offense("t2", "2", 0.18, 0.72),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const screener = result.objects.find((o) => o.label === "1");
    const ballHandler = result.objects.find((o) => o.label === "2");
    assert.ok(screener);
    assert.ok(ballHandler);
    assert.ok(Math.abs(screener!.x - 0.82) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.72) < 0.01);
    assert.ok(Math.abs(ballHandler!.x - 0.5) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.38) < 0.01);
  });

  it("backwards screen still moves non-ball screener to screening spot", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.82, 0.72),
        offense("o2", "2", 0.18, 0.72, true),
      ],
      [makeAction("screen", 0.25, 0.58, 0.82, 0.72, "sc1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.82, 0.72),
      offense("t2", "2", 0.18, 0.72),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const screener = result.objects.find((o) => o.label === "1");
    const ballHandler = result.objects.find((o) => o.label === "2");
    assert.ok(screener);
    assert.ok(ballHandler);
    assert.ok(Math.abs(screener!.x - 0.25) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.58) < 0.01);
    assert.ok(Math.abs(ballHandler!.x - 0.18) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.72) < 0.01);
  });

  it("wing screen and dribble from photo scenario", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.82, 0.72),
        offense("o2", "2", 0.18, 0.72, true),
      ],
      [
        makeAction("dribble", 0.82, 0.72, 0.5, 0.38, "d1"),
        makeAction("screen", 0.25, 0.58, 0.82, 0.72, "sc1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.82, 0.72),
      offense("t2", "2", 0.18, 0.72),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const screener = result.objects.find((o) => o.label === "1");
    const ballHandler = result.objects.find((o) => o.label === "2");
    assert.ok(screener);
    assert.ok(ballHandler);
    assert.ok(Math.abs(ballHandler!.x - 0.5) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.38) < 0.01);
    assert.ok(Math.abs(screener!.x - 0.25) < 0.01);
    assert.ok(Math.abs(screener!.y - 0.58) < 0.01);
  });

  it("five-player wing screen with ball at screening spot moves screener not others", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.88),
        offense("o2", "2", 0.85, 0.55),
        offense("o3", "3", 0.5, 0.38, true),
        offense("o4", "4", 0.15, 0.55),
        offense("o5", "5", 0.78, 0.72),
      ],
      [
        makeAction("screen", 0.75, 0.72, 0.5, 0.38, "sc1"),
        makeAction("dribble", 0.5, 0.38, 0.62, 0.42, "d1"),
        makeAction("cut", 0.85, 0.55, 0.92, 0.82, "c1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.88),
      offense("t2", "2", 0.85, 0.55),
      offense("t3", "3", 0.5, 0.38),
      offense("t4", "4", 0.15, 0.55),
      offense("t5", "5", 0.78, 0.72),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const p1 = result.objects.find((o) => o.label === "1");
    const p2 = result.objects.find((o) => o.label === "2");
    const p3 = result.objects.find((o) => o.label === "3");
    const p4 = result.objects.find((o) => o.label === "4");
    const p5 = result.objects.find((o) => o.label === "5");
    assert.ok(p1 && p2 && p3 && p4 && p5);

    assert.ok(Math.abs(p1!.x - 0.5) < 0.01);
    assert.ok(Math.abs(p1!.y - 0.88) < 0.01);
    assert.ok(Math.abs(p2!.x - 0.92) < 0.01);
    assert.ok(Math.abs(p2!.y - 0.82) < 0.01);
    assert.ok(Math.abs(p3!.x - 0.62) < 0.01);
    assert.ok(Math.abs(p3!.y - 0.42) < 0.01);
    assert.ok(Math.abs(p4!.x - 0.15) < 0.01);
    assert.ok(Math.abs(p4!.y - 0.55) < 0.01);
    assert.ok(Math.abs(p5!.x - 0.5) < 0.01);
    assert.ok(Math.abs(p5!.y - 0.38) < 0.01);
    assert.equal(ballHolderLabel(result), "3");
  });

  it("cut moves player to action endpoint", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.7)],
      [makeAction("cut", 0.5, 0.7, 0.6, 0.4, "c1")],
    );
    const target = makeTargetFrame([offense("t1", "1", 0.5, 0.7)]);

    const result = applyActionResultsToFrame(source, target);
    const player = result.objects.find((o) => o.label === "1");
    assert.ok(player);
    assert.ok(Math.abs(player!.x - 0.6) < 0.01);
    assert.ok(Math.abs(player!.y - 0.4) < 0.01);
  });

  it("cut moves cutter not ball handler", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
      ],
      [makeAction("cut", 0.8, 0.75, 0.5, 0.5, "c1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const ballHandler = result.objects.find((o) => o.label === "1");
    const cutter = result.objects.find((o) => o.label === "2");
    assert.ok(ballHandler);
    assert.ok(cutter);
    assert.ok(Math.abs(ballHandler!.x - 0.2) < 0.01);
    assert.ok(Math.abs(ballHandler!.y - 0.75) < 0.01);
    assert.ok(Math.abs(cutter!.x - 0.5) < 0.01);
    assert.ok(Math.abs(cutter!.y - 0.5) < 0.01);
    assert.equal(ballHolderLabel(result), "1");
  });

  it("curl moves curler not ball handler", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
      ],
      [makeAction("curl", 0.8, 0.75, 0.55, 0.45, "cu1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const ballHandler = result.objects.find((o) => o.label === "1");
    const curler = result.objects.find((o) => o.label === "2");
    assert.ok(ballHandler);
    assert.ok(curler);
    assert.ok(Math.abs(ballHandler!.x - 0.2) < 0.01);
    assert.ok(Math.abs(curler!.x - 0.55) < 0.01);
    assert.ok(Math.abs(curler!.y - 0.45) < 0.01);
    assert.equal(ballHolderLabel(result), "1");
  });

  it("pass then screen for third player moves passer to screening spot with ball on receiver", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.2, 0.75, true),
        offense("o2", "2", 0.8, 0.75),
        offense("o3", "3", 0.5, 0.45),
      ],
      [
        makeAction("pass", 0.2, 0.75, 0.8, 0.75, "p1"),
        makeAction("screen", 0.2, 0.75, 0.48, 0.42, "sc1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.2, 0.75),
      offense("t2", "2", 0.8, 0.75),
      offense("t3", "3", 0.5, 0.45),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const passer = result.objects.find((o) => o.label === "1");
    const receiver = result.objects.find((o) => o.label === "2");
    const screened = result.objects.find((o) => o.label === "3");
    assert.ok(passer);
    assert.ok(receiver);
    assert.ok(screened);
    assert.equal(ballHolderLabel(result), "2");
    assert.ok(Math.abs(passer!.x - 0.48) < 0.01);
    assert.ok(Math.abs(passer!.y - 0.42) < 0.01);
    assert.ok(Math.abs(receiver!.x - 0.8) < 0.01);
    assert.ok(Math.abs(receiver!.y - 0.75) < 0.01);
    assert.ok(Math.abs(screened!.x - 0.5) < 0.01);
    assert.ok(Math.abs(screened!.y - 0.45) < 0.01);
  });

  it("short pass then screen for third still moves passer not receiver or screened", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.5, true),
        offense("o2", "2", 0.55, 0.52),
        offense("o3", "3", 0.22, 0.22),
      ],
      [
        makeAction("pass", 0.5, 0.5, 0.55, 0.52, "p1"),
        makeAction("screen", 0.5, 0.5, 0.2, 0.2, "sc1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.5),
      offense("t2", "2", 0.55, 0.52),
      offense("t3", "3", 0.22, 0.22),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const passer = result.objects.find((o) => o.label === "1");
    const receiver = result.objects.find((o) => o.label === "2");
    const screened = result.objects.find((o) => o.label === "3");
    assert.ok(passer);
    assert.ok(receiver);
    assert.ok(screened);
    assert.equal(ballHolderLabel(result), "2");
    assert.ok(Math.abs(passer!.x - 0.2) < 0.01);
    assert.ok(Math.abs(passer!.y - 0.2) < 0.01);
    assert.ok(Math.abs(receiver!.x - 0.55) < 0.01);
    assert.ok(Math.abs(receiver!.y - 0.52) < 0.01);
    assert.ok(Math.abs(screened!.x - 0.22) < 0.01);
    assert.ok(Math.abs(screened!.y - 0.22) < 0.01);
  });

  it("dribble then pass uses dribble end for passer snap", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.7, true), offense("o2", "2", 0.25, 0.4)],
      [
        makeAction("dribble", 0.5, 0.7, 0.65, 0.55, "d1"),
        makeAction("pass", 0.65, 0.55, 0.25, 0.4, "p1"),
      ],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.7),
      offense("t2", "2", 0.25, 0.4),
    ]);

    const result = applyActionResultsToFrame(source, target);
    assert.equal(ballHolderLabel(result), "2");
    const dribbler = result.objects.find((o) => o.label === "1");
    assert.ok(dribbler);
    assert.ok(Math.abs(dribbler!.x - 0.65) < 0.01);
  });

  it("second dribble continues from first dribble end", () => {
    const source = makeFrame(
      [offense("o1", "1", 0.5, 0.7, true)],
      [
        makeAction("dribble", 0.5, 0.7, 0.65, 0.55, "d1"),
        makeAction("dribble", 0.65, 0.55, 0.75, 0.45, "d2"),
      ],
    );
    const target = makeTargetFrame([offense("t1", "1", 0.5, 0.7)]);

    const result = applyActionResultsToFrame(source, target);
    const dribbler = result.objects.find((o) => o.label === "1");
    assert.ok(dribbler);
    assert.ok(Math.abs(dribbler!.x - 0.75) < 0.01);
    assert.ok(Math.abs(dribbler!.y - 0.45) < 0.01);
    assert.equal(ballHolderLabel(result), "1");
  });

  it("defense players never receive hasBall", () => {
    const source = makeFrame(
      [
        offense("o1", "1", 0.5, 0.6, true),
        defense("d1", "x1", 0.3, 0.4),
      ],
      [makeAction("pass", 0.5, 0.6, 0.3, 0.4, "p1")],
    );
    const target = makeTargetFrame([
      offense("t1", "1", 0.5, 0.6),
      defense("td1", "x1", 0.3, 0.4),
    ]);

    const result = applyActionResultsToFrame(source, target);
    const defender = result.objects.find((o) => o.kind === "defense");
    assert.equal(defender?.hasBall, false);
  });
});
