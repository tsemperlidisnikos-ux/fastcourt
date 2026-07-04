import assert from "node:assert/strict";
import test from "node:test";
import { suggestPlaysFromAiPatterns } from "../../src/lib/film-room/ai-play-pattern-match.ts";
import type { StoredPlay } from "../../src/types/library.ts";

function stubPlay(id: string, title: string, tags: string[] = []): StoredPlay {
  return {
    id,
    title,
    courtType: "half",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], actionSequence: [] }],
    type: "play",
    tags,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("suggestPlaysFromAiPatterns matches Horns tag", () => {
  const plays = [
    stubPlay("p1", "Horns Flex", ["horns", "flex"]),
    stubPlay("p2", "Zone Shell", ["defense", "zone"]),
  ];
  const matches = suggestPlaysFromAiPatterns(
    plays,
    [{ tag: "Horns", confidence: 0.9 }],
    new Set(),
    4,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.play.id, "p1");
});
