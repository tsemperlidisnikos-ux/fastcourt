import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildBatchAnalyzeTargets,
  formatBatchSummaryLine,
  summarizeBatchAnalysis,
} from "../../src/lib/film-room/film-batch-analyze.ts";
import { createFilmBookmark } from "../../src/lib/film-room/film-room-bookmarks.ts";

describe("film-batch-analyze", () => {
  it("builds disruption targets from bookmarks and tags", () => {
    const targets = buildBatchAnalyzeTargets(
      [
        createFilmBookmark(30, "Plan broke here", undefined, "disruption"),
        createFilmBookmark(90, "ATO", undefined, "chapter"),
      ],
      [{ id: "d1", kind: "ice", time: 32, createdAt: 1 }],
      "disruptions",
    );
    assert.equal(targets.length, 2);
    assert.equal(targets[0]?.time, 30);
    assert.equal(targets[1]?.source, "disruption_tag");
  });

  it("summarizes batch analysis records", () => {
    const summary = summarizeBatchAnalysis([
      {
        id: "a1",
        playheadTime: 30,
        frameCount: 10,
        coachTags: [],
        createdAt: 1,
        result: {
          summary: "ICE side",
          tendencies: [],
          playPatterns: [{ tag: "Horns", confidence: 0.9 }],
          coaching: {
            alternativeOptions: [],
            counters: [],
            defensiveAdjustments: [],
            spacingFixes: [],
            timingCorrections: [],
          },
          disruption: {
            detected: true,
            coverage: "ice",
            suggestedRead: "reject",
            whatBroke: "No middle",
          },
        },
      },
    ]);
    assert.equal(summary.disruptionDetectedCount, 1);
    assert.equal(summary.coverageCounts.ice, 1);
    assert.match(formatBatchSummaryLine(summary), /reject/i);
  });
});
