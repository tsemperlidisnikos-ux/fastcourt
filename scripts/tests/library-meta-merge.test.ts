import assert from "node:assert/strict";
import { mergeOrganizerMeta } from "../../src/lib/cloud/merge-meta";

const merged = mergeOrganizerMeta(
  {
    seasons: ["Default", "2025-26"],
    teams: ["Varsity"],
    series: ["Horns"],
    fieldTags: ["ATO"],
    playbooks: [
      {
        id: "pb1",
        name: "Local PB",
        team: "Varsity",
        playRefs: ["p1"],
        updatedAt: "2026-06-19T12:00:00.000Z",
      },
    ],
    practice: {
      sessions: [
        {
          id: "pr1",
          date: "2026-06-19",
          title: "Local practice",
          team: "Varsity",
          items: [],
          createdAt: "2026-06-19T10:00:00.000Z",
          updatedAt: "2026-06-19T10:00:00.000Z",
        },
      ],
    },
    gamePlans: [],
    playerHomework: [],
  },
  {
    seasons: ["Default", "2024-25"],
    teams: ["JV"],
    series: [],
    fieldTags: ["BLOB"],
    playbooks: [
      {
        id: "pb1",
        name: "Remote PB",
        team: "JV",
        playRefs: ["p2"],
        updatedAt: "2026-06-19T11:00:00.000Z",
      },
      {
        id: "pb2",
        name: "Remote only",
        team: "JV",
        playRefs: [],
        updatedAt: "2026-06-19T09:00:00.000Z",
      },
    ],
    practice: {
      sessions: [
        {
          id: "pr2",
          date: "2026-06-18",
          title: "Remote practice",
          team: "JV",
          items: [],
          createdAt: "2026-06-18T10:00:00.000Z",
          updatedAt: "2026-06-18T10:00:00.000Z",
        },
      ],
    },
    gamePlans: [],
    playerHomework: [],
  },
);

assert.ok(merged.seasons.includes("2025-26"));
assert.ok(merged.seasons.includes("2024-25"));
assert.ok(merged.teams.includes("Varsity"));
assert.ok(merged.teams.includes("JV"));
assert.equal(merged.playbooks.find((p) => p.id === "pb1")?.name, "Local PB");
assert.equal(merged.playbooks.length, 2);
assert.equal(merged.practice.sessions.length, 2);

console.log("library-meta-merge.test.ts: ok");
