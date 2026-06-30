import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  designerDocumentsEqual,
  serializeDesignerDocument,
} from "../../src/lib/designer/designer-document-snapshot.ts";
import type { StoredPlay } from "../../src/types/library.ts";

function samplePlay(overrides: Partial<StoredPlay> = {}): StoredPlay {
  return {
    id: "play-1",
    title: "Horns",
    courtType: "half",
    frames: [{ id: "f1", name: "Frame 1", objects: [], actions: [], notes: "" }],
    animSpeed: 1,
    animPauseMs: 0,
    type: "play",
    season: "2025-26",
    team: "Team A",
    series: "",
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    source: "manual",
    ...overrides,
  };
}

describe("designer-document-snapshot", () => {
  it("ignores updatedAt when comparing documents", () => {
    const a = samplePlay({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const b = samplePlay({ updatedAt: "2026-06-19T12:00:00.000Z" });
    assert.equal(designerDocumentsEqual(a, b), true);
  });

  it("detects frame edits", () => {
    const a = samplePlay();
    const b = samplePlay({
      frames: [
        {
          id: "f1",
          name: "Frame 1",
          objects: [{ id: "o1", kind: "offense", x: 0.5, y: 0.5, label: "1" }],
          actions: [],
          notes: "",
        },
      ],
    });
    assert.notEqual(serializeDesignerDocument(a), serializeDesignerDocument(b));
  });
});
