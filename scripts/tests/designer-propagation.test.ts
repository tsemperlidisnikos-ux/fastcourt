import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import {
  ballHolderLabel,
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
