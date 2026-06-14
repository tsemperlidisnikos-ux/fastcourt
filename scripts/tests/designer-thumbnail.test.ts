import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ballHolderIdsAtFrameStart,
  frameObjectsForDesignerThumbnail,
  framesForDesignerThumbnails,
} from "@/lib/designer/thumbnail-objects";
import { makeAction, makeFrame, offense } from "./helpers";

describe("thumbnail ball possession", () => {
  it("shows manual ball assignment in thumbnail without actions", () => {
    const frame = makeFrame(
      [offense("o1", "1", 0.5, 0.2, true), offense("o2", "2", 0.3, 0.4)],
      [],
    );

    const thumb = frameObjectsForDesignerThumbnail(frame);
    assert.equal(thumb.find((o) => o.label === "1")?.hasBall, true);
    assert.equal(thumb.find((o) => o.label === "2")?.hasBall, false);
  });

  it("prefers dribble start over default ball holder when they differ", () => {
    const frame = makeFrame(
      [
        offense("o1", "1", 0.5, 0.2, true),
        offense("o3", "3", 0.2, 0.5),
      ],
      [makeAction("dribble", 0.2, 0.5, 0.75, 0.5, "d1")],
    );

    const ids = ballHolderIdsAtFrameStart(frame);
    assert.equal(ids.has("o3"), true);
    assert.equal(ids.has("o1"), false);

    const thumb = frameObjectsForDesignerThumbnail(frame);
    assert.equal(thumb.find((o) => o.label === "3")?.hasBall, true);
    assert.equal(thumb.find((o) => o.label === "1")?.hasBall, false);
  });

  it("propagates dribble ball holder to the next thumbnail frame", () => {
    const frame1 = makeFrame(
      [
        offense("o1", "1", 0.5, 0.2, true),
        offense("o3", "3", 0.2, 0.5),
      ],
      [makeAction("dribble", 0.2, 0.5, 0.75, 0.5, "d1")],
    );
    const frame2 = makeFrame(
      [
        offense("t1", "1", 0.5, 0.2),
        offense("t3", "3", 0.2, 0.5),
      ],
      [],
    );

    const [thumb1, thumb2] = framesForDesignerThumbnails([frame1, frame2]);
    const holder1 = frameObjectsForDesignerThumbnail(thumb1).find(
      (o) => o.label === "3",
    );
    const holder2 = frameObjectsForDesignerThumbnail(thumb2).find(
      (o) => o.label === "3",
    );

    assert.equal(holder1?.hasBall, true);
    assert.equal(holder2?.hasBall, true);
    assert.ok(Math.abs((holder2?.x ?? 0) - 0.75) < 0.02);
  });
});
