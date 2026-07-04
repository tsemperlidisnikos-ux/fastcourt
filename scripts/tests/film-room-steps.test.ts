import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendFilmAnalysisRecord,
  createFilmAnalysisRecord,
  filmAnalysisRecordLabel,
} from "../../src/lib/film-room/film-analysis-history.ts";
import { normalizeFilmEventKind } from "../../src/lib/film-room/film-event-tags.ts";
import { canCaptureFilmFrames } from "../../src/lib/film-room/capture-film-frames.ts";

describe("film room steps 1-6 helpers", () => {
  it("accepts expanded event kinds", () => {
    assert.equal(normalizeFilmEventKind("iso"), "iso");
    assert.equal(normalizeFilmEventKind("flare"), "flare");
    assert.equal(normalizeFilmEventKind("transition"), "transition");
    assert.equal(normalizeFilmEventKind("invalid"), null);
  });

  it("allows youtube sources for capture", () => {
    assert.equal(
      canCaptureFilmFrames({ kind: "youtube", videoId: "abc", originalUrl: "https://youtube.com/watch?v=abc" }),
      true,
    );
  });

  it("caps analysis history per session", () => {
    const base = {
      id: "film_1",
      title: "Clip",
      source: { kind: "direct" as const, url: "https://example.com/a.mp4" },
      strokes: [],
      events: [],
      analyses: [],
      createdAt: 1,
      updatedAt: 1,
    };
    let session = base;
    for (let i = 0; i < 35; i += 1) {
      session = appendFilmAnalysisRecord(
        session,
        createFilmAnalysisRecord({
          playheadTime: i,
          frameCount: 10,
          coachTags: [],
          result: {
            summary: `Read ${i}`,
            tendencies: [],
            playPatterns: [],
            coaching: {
              alternativeOptions: [],
              counters: [],
              defensiveAdjustments: [],
              spacingFixes: [],
              timingCorrections: [],
            },
          },
        }),
      );
    }
    assert.equal(session.analyses.length, 30);
    assert.match(filmAnalysisRecordLabel(session.analyses[0]!), /Read 34/);
  });
});
