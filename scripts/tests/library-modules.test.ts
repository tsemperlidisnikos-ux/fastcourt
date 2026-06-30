import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blankStoredPlay,
  storedPlayToLibraryItem,
} from "@/lib/library/convert";

describe("library play model", () => {
  it("blankStoredPlay creates one empty frame", () => {
    const play = blankStoredPlay("Test Play");
    assert.equal(play.title, "Test Play");
    assert.equal(play.frames.length, 1);
    assert.equal(play.frames[0]!.objects.length, 0);
    assert.equal(play.frames[0]!.actions.length, 0);
    assert.ok(play.id);
    assert.ok(play.createdAt);
  });

  it("storedPlayToLibraryItem maps frame count", () => {
    const play = blankStoredPlay("Mapper");
    const item = storedPlayToLibraryItem(play);
    assert.equal(item.title, "Mapper");
    assert.equal(item.frameCount, 1);
    assert.equal(item.type, "play");
  });
});
