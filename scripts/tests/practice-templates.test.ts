import assert from "node:assert/strict";
import { templateFromSession } from "../../src/lib/practice/templates";
import type { PracticeSession } from "../../src/types/library-meta";

const session: PracticeSession = {
  id: "sess_1",
  date: "2026-06-19",
  title: "Monday offense",
  team: "Varsity",
  notes: "Focus on spacing",
  items: [
    { id: "i1", playId: "play_a", durationMin: 10, notes: "" },
    { id: "i2", cueLabel: "Warm-up", durationMin: 8, notes: "Dynamic" },
  ],
  createdAt: "2026-06-19T10:00:00.000Z",
  updatedAt: "2026-06-19T10:00:00.000Z",
};

const created = templateFromSession(session, "  My template  ");
assert.equal(created.name, "My template");
assert.equal(created.title, "Monday offense");
assert.equal(created.items.length, 2);
assert.equal(created.items[0]?.playId, "play_a");
assert.equal(created.items[1]?.cueLabel, "Warm-up");
assert.ok(created.id.startsWith("tpl_"));
assert.ok(created.createdAt);

const updated = templateFromSession(session, "Renamed", {
  id: "tpl_existing",
  createdAt: "2026-01-01T00:00:00.000Z",
});
assert.equal(updated.id, "tpl_existing");
assert.equal(updated.createdAt, "2026-01-01T00:00:00.000Z");
assert.equal(updated.name, "Renamed");

console.log("practice-templates.test.ts: ok");
