import assert from "node:assert/strict";
import {
  filterByTombstones,
  isLibraryItemTombstoned,
  mergeLibraryTombstones,
} from "../../src/lib/cloud/merge-tombstones";

const merged = mergeLibraryTombstones(
  [{ id: "a", kind: "play", deletedAt: "2026-06-19T12:00:00.000Z" }],
  [{ id: "a", kind: "play", deletedAt: "2026-06-19T11:00:00.000Z" }],
);
assert.equal(merged.length, 1);
assert.equal(merged[0]?.deletedAt, "2026-06-19T12:00:00.000Z");

assert.equal(
  isLibraryItemTombstoned("a", "play", "2026-06-19T10:00:00.000Z", merged),
  true,
);
assert.equal(
  isLibraryItemTombstoned("a", "play", "2026-06-19T13:00:00.000Z", merged),
  false,
);

const plays = filterByTombstones(
  [
    { id: "keep", updatedAt: "2026-06-19T10:00:00.000Z" },
    { id: "a", updatedAt: "2026-06-19T10:00:00.000Z" },
  ],
  "play",
  [{ id: "a", kind: "play", deletedAt: "2026-06-19T12:00:00.000Z" }],
);
assert.equal(plays.length, 1);
assert.equal(plays[0]?.id, "keep");

console.log("library-tombstones.test.ts: ok");
