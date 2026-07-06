import assert from "node:assert/strict";
import { filterCoachFilmEvidence } from "../../src/lib/designer/designer-coach-film-evidence";
import type { GamePlan } from "../../src/types/library-meta";

const plan: GamePlan = {
  id: "gp-1",
  title: "vs Central",
  opponent: "Central",
  gameDate: "2026-07-10",
  team: "Varsity",
  status: "active",
  entries: [],
  filmRefs: [
    {
      id: "ref-1",
      sessionId: "film-1",
      timestamp: 92.4,
      label: "ICE reject vs PNR",
      detail: "Ball handler refuses screen",
      playId: "play-a",
      frameIndex: 1,
      createdAt: "",
    },
    {
      id: "ref-2",
      sessionId: "film-2",
      timestamp: 40,
      label: "Horns flare",
      createdAt: "",
    },
  ],
  createdAt: "",
  updatedAt: "",
};

const ranked = filterCoachFilmEvidence(
  plan,
  { id: "play-a", title: "PNR Side", tags: ["pnr"] },
  1,
  ["PNR"],
);

assert.ok(ranked.length >= 2, "expected film evidence rows");
assert.equal(ranked[0]?.playId, "play-a");
assert.equal(ranked[0]?.matchReason, "This frame on film");

console.log("designer-coach-film-evidence.test.ts OK");
