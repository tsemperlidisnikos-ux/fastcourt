import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultReadBranchForCoverage,
  frameThumbBadge,
  isReadFrame,
  primaryFrameLabel,
} from "../../src/lib/designer/frame-read-branch.ts";
import type { DesignerFrame } from "../../src/types/designer.ts";

describe("frame-read-branch", () => {
  const primary: DesignerFrame = {
    id: "f1",
    name: "Horns Entry",
    objects: [],
    actions: [],
  };

  const read: DesignerFrame = {
    id: "f2",
    name: "Reject",
    objects: [],
    actions: [],
    readBranch: defaultReadBranchForCoverage("ice", "f1", "If ICE — Reject"),
  };

  it("identifies read frames", () => {
    assert.equal(isReadFrame(primary), false);
    assert.equal(isReadFrame(read), true);
  });

  it("shows read label on thumb", () => {
    assert.equal(primaryFrameLabel(read, 1), "If ICE — Reject");
    assert.equal(frameThumbBadge(read), "ICE");
  });
});
