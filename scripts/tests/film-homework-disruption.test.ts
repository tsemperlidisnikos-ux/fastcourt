import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGamePlanDraft } from "../../src/lib/game-plan/game-plan-items.ts";
import {
  buildDisruptionHomeworkFromPlan,
  buildHomeworkReadItemsFromEntries,
  countNewHomeworkReads,
  mergeHomeworkReadItems,
} from "../../src/lib/film-room/film-homework-disruption.ts";
import { normalizePlayerHomework } from "../../src/lib/game-plan/player-homework.ts";
import { encodeHomeworkPayload } from "../../src/lib/share/share-link.ts";
import type { StoredPlay } from "../../src/types/library.ts";

describe("film-homework-disruption", () => {
  const play: StoredPlay = {
    id: "p1",
    title: "Horns Reject",
    type: "play",
    tags: ["reject"],
    frames: [{ id: "f0", objects: [] }, { id: "f1", objects: [] }],
    courtType: "half",
    createdAt: "",
    updatedAt: "",
  };

  it("builds read items from disruption practice entries", () => {
    const items = buildHomeworkReadItemsFromEntries(
      [
        {
          playId: "p1",
          notes: "Film read: ICE · Read: Reject",
          liveCall: "Reject / snake",
          designerFrameIndex: 1,
        },
      ],
      { sessionId: "film_1", timestamp: 42 },
    );
    assert.equal(items.length, 1);
    assert.equal(items[0]?.liveCall, "Reject / snake");
    assert.equal(items[0]?.frameIndex, 1);
    assert.equal(items[0]?.filmSessionId, "film_1");
  });

  it("merges read items without duplicates", () => {
    const merged = mergeHomeworkReadItems(
      [{ playId: "p1", frameIndex: 1, liveCall: "Reject" }],
      [{ playId: "p1", frameIndex: 1, liveCall: "Reject" }],
    );
    assert.equal(merged.length, 1);
    assert.equal(countNewHomeworkReads(merged, [{ playId: "p1", frameIndex: 1 }]), 0);
  });

  it("builds homework assignment and share payload with film reads", () => {
    const plan = createGamePlanDraft("Rival", "Varsity");
    const assignment = buildDisruptionHomeworkFromPlan(plan, [
      { playId: "p1", frameIndex: 1, liveCall: "Reject / snake" },
    ]);
    assert.equal(assignment.readItems?.length, 1);
    assert.ok(assignment.playIds.includes("p1"));

    const payload = encodeHomeworkPayload(
      normalizePlayerHomework(assignment),
      plan,
      [play],
    );
    assert.equal(payload.type, "homework");
    if (payload.type !== "homework") return;
    assert.equal(payload.entries[0]?.categoryLabel, "Film reads");
    assert.equal(payload.entries[0]?.liveCall, "Reject / snake");
    assert.equal(payload.entries[0]?.frameIndex, 1);
  });
});
