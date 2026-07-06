import assert from "node:assert/strict";
import {
  buildDesignerCoachPrepReads,
  findPrepReadPracticeSession,
  formatPrepReadCoachNotes,
  prepReadMatchesCurrentPlay,
  prioritizePrepReadsForPlay,
} from "../../src/lib/designer/designer-coach-prep-reads";
import type { GamePlan, PracticeSession } from "../../src/types/library-meta";

const plan: GamePlan = {
  id: "gp1",
  title: "vs Central",
  opponent: "Central",
  gameDate: "2026-07-10",
  team: "Varsity",
  timeoutCues: [{ id: "c1", title: "ICE", detail: "Force baseline", coverage: "ice", createdAt: "" }],
  entries: [],
  status: "ready",
  createdAt: "",
  updatedAt: "",
};

const sessions: PracticeSession[] = [
  {
    id: "pr1",
    date: "2026-06-01",
    title: "Prep vs Central",
    team: "Varsity",
    items: [
      {
        id: "pi1",
        playId: "play-ice",
        liveCall: "ICE reject",
        durationMin: 10,
        readOutcome: "missed",
      },
      {
        id: "pi2",
        playId: "play-ice",
        liveCall: "ICE reject",
        durationMin: 10,
        readOutcome: "missed",
      },
      {
        id: "pi3",
        playId: "play-ice",
        liveCall: "ICE reject",
        durationMin: 10,
        readOutcome: "landed",
      },
    ],
    createdAt: "",
    updatedAt: "2026-06-02",
  },
];

const reads = buildDesignerCoachPrepReads(
  plan,
  sessions,
  [{ id: "play-ice", title: "ICE Reject", type: "play", courtType: "half", frames: [], updatedAt: "", createdAt: "" }],
  [plan],
  { id: "play-ice", title: "ICE Reject", tags: ["ice"] },
);

assert.ok(reads.length > 0, "expected weak reads from practice history");
assert.ok(
  prepReadMatchesCurrentPlay(reads[0]!, { id: "play-ice", title: "ICE Reject" }),
  "linked play should match current play",
);

const sorted = prioritizePrepReadsForPlay(
  [
    {
      id: "a",
      call: "Other",
      missedCount: 2,
      landedCount: 0,
      missRatePct: 100,
      suggestedBlocks: 1,
      reason: "test",
      coverages: [],
      matchesCoverage: false,
      source: "team-trend",
    },
    {
      id: "b",
      call: "ICE reject",
      playId: "play-ice",
      missedCount: 2,
      landedCount: 1,
      missRatePct: 67,
      suggestedBlocks: 1,
      reason: "test",
      coverages: ["ice"],
      matchesCoverage: true,
      source: "opponent-history",
    },
  ],
  { id: "play-ice", title: "ICE Reject" },
);
assert.equal(sorted[0]?.id, "b", "current play read should sort first");

const session = findPrepReadPracticeSession(plan, sessions);
assert.equal(session?.id, "pr1");

const notes = formatPrepReadCoachNotes(reads[0]!, "Central", "Frame 1");
assert.ok(notes.includes("Central"));

console.log("designer-coach-prep-reads.test.ts OK");
