import assert from "node:assert/strict";
import { mergePlaysByUpdatedAt } from "../../src/lib/cloud/merge-plays";
import type { StoredPlay } from "../../src/types/library";

function play(id: string, updatedAt: string): StoredPlay {
  return {
    id,
    title: id,
    type: "play",
    courtType: "half",
    frames: [],
    tags: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

const merged = mergePlaysByUpdatedAt(
  [play("a", "2026-06-19T10:00:00.000Z"), play("b", "2026-06-19T11:00:00.000Z")],
  [play("a", "2026-06-19T12:00:00.000Z"), play("c", "2026-06-19T09:00:00.000Z")],
);
assert.equal(merged.length, 3);
assert.equal(merged.find((p) => p.id === "a")?.updatedAt, "2026-06-19T12:00:00.000Z");
assert.equal(merged.find((p) => p.id === "b")?.title, "b");
assert.equal(merged.find((p) => p.id === "c")?.title, "c");

console.log("library-merge.test.ts: ok");
