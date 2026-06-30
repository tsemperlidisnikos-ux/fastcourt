import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adoptImportedPlaysForSession } from "../../src/lib/settings/library-backup.ts";
import type { StoredPlay } from "../../src/types/library";

function samplePlay(id: string, ownerUserId?: string): StoredPlay {
  return {
    id,
    title: id,
    type: "play",
    courtType: "half",
    frames: [],
    tags: [],
    createdAt: "2026-06-20T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ownerUserId,
    ownerEmail: ownerUserId ? "old@club.com" : undefined,
  };
}

describe("library backup import", () => {
  it("repairs empty frames before adopt", async () => {
    const adopted = await adoptImportedPlaysForSession([
      samplePlay("legacy"),
      samplePlay("other-user", "coach-old"),
    ]);
    assert.equal(adopted.length, 2);
    assert.equal(adopted[0]?.frames.length, 1);
    assert.equal(adopted[1]?.frames.length, 1);
  });
});
