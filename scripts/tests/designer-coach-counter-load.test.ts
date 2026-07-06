import assert from "node:assert/strict";
import { resolveCounterDefensePlay } from "../../src/lib/designer/designer-coach-counter-load";
import type { FilmClipCounterSuggestion } from "../../src/lib/film-room/film-clip-analyze-types";
import type { StoredPlay } from "../../src/types/library";

const counter: FilmClipCounterSuggestion = {
  title: "ICE vs PNR",
  detail: "Force baseline",
  coverage: "ice",
  targetsPattern: "PNR",
  priority: "high",
};

const library: StoredPlay[] = [
  {
    id: "def-ice",
    title: "ICE Side",
    type: "play",
    courtType: "half",
    tags: ["ice", "defense"],
    frames: [{ id: "f1", objects: [], actions: [] }],
    updatedAt: "",
    createdAt: "",
  },
];

const resolved = resolveCounterDefensePlay(counter, library, [], "offense-play");
assert.ok(resolved, "expected defense play match");
assert.equal(resolved?.playId, "def-ice");

const fromLinked = resolveCounterDefensePlay(
  counter,
  library,
  [{ playId: "gp-def", title: "Game plan ICE", reason: "On game plan vs Central" }],
  "offense-play",
);
assert.equal(fromLinked?.playId, "gp-def");

console.log("designer-coach-counter-load.test.ts OK");
