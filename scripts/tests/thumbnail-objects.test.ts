import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ballHolderIdsAtFrameStart,
  frameObjectsForDesignerThumbnail,
  framesForDesignerThumbnails,
} from "@/lib/designer/thumbnail-objects";
import { fastDrawBallRingOuterRadiusPx } from "@/lib/designer/player-ball-ring";
import { makeAction, makeFrame, offense } from "./helpers";

describe("thumbnail ball possession", () => {
  it("keeps propagated ball holder over first-action inference", () => {
    const frame = makeFrame(
      [
        offense("o1", "1", 0.5, 0.6),
        offense("o2", "2", 0.45, 0.55, true),
      ],
      [makeAction("dribble", 0.5, 0.6, 0.55, 0.5, "d1")],
    );

    const ids = ballHolderIdsAtFrameStart(frame);
    assert.equal(ids.size, 1);
    assert.ok(ids.has("o2"));
  });

  it("infers ball holder from first action when none is marked", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.6), offense("o2", "2", 0.45, 0.55)],
      [makeAction("dribble", 0.5, 0.6, 0.55, 0.5, "d1")],
    );

    const ids = ballHolderIdsAtFrameStart(frame);
    assert.equal(ids.size, 1);
    assert.ok(ids.has("o1"));
  });

  it("resolves duplicate hasBall to taker after handoff", () => {
    const frame = makeFrame(
      [
        offense("t1", "1", 0.5, 0.5, true),
        offense("t2", "2", 0.82, 0.72, true),
      ],
      [makeAction("handoff", 0.18, 0.72, 0.5, 0.5, "h1")],
    );

    const ids = ballHolderIdsAtFrameStart(frame);
    assert.equal(ids.size, 1);
    assert.ok(ids.has("t2"));

    const objs = frameObjectsForDesignerThumbnail(frame);
    assert.equal(objs.filter((o) => o.hasBall).length, 1);
    assert.equal(objs.find((o) => o.label === "2")?.hasBall, true);
    assert.equal(objs.find((o) => o.label === "1")?.hasBall, false);
  });

  it("frame 2 thumbnail after handoff shows taker with ball", () => {
    const f1 = makeFrame(
      [
        offense("o1", "1", 0.18, 0.72, true),
        offense("o2", "2", 0.82, 0.72),
      ],
      [makeAction("handoff", 0.18, 0.72, 0.5, 0.5, "h1")],
    );
    const f2 = makeFrame(
      [
        offense("t1", "1", 0.18, 0.72, true),
        offense("t2", "2", 0.82, 0.72, true),
      ],
      [makeAction("dribble", 0.18, 0.72, 0.45, 0.45, "d1")],
    );

    const thumbs = framesForDesignerThumbnails([f1, f2]);
    const objs = frameObjectsForDesignerThumbnail(thumbs[1]!);
    const ballHolder = objs.find((o) => o.kind === "offense" && o.hasBall);
    assert.ok(ballHolder);
    assert.equal(ballHolder!.label, "2");
    assert.equal(objs.filter((o) => o.hasBall).length, 1);
  });
});

describe("thumbnail ball ring sizing", () => {
  it("stays tight around jersey numbers", () => {
    assert.ok(fastDrawBallRingOuterRadiusPx(8) < 7);
    assert.ok(fastDrawBallRingOuterRadiusPx(26) < 20);
  });

  it("scales down in compact thumbnails", () => {
    assert.ok(
      fastDrawBallRingOuterRadiusPx(26, 0.2) <
        fastDrawBallRingOuterRadiusPx(26, 1),
    );
  });
});
