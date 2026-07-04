import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFilmScoutPrintClipBlock,
  buildFilmScoutPrintModel,
  buildFilmScoutPrintModelFromSessionAnalyses,
  formatFilmScoutGeneratedAt,
} from "../../src/lib/film-room/film-scout-print-model.ts";
import type { FilmRoomSession } from "../../src/types/film-room.ts";

const sampleResult = {
  summary: "They flow into side PNR with weak-side tag.",
  tendencies: [
    {
      kind: "halfcourt" as const,
      label: "Side ball screen",
      confidence: 0.88,
      notes: "Nail help late",
    },
  ],
  playPatterns: [{ tag: "PNR", confidence: 0.76 }],
  coaching: {
    alternativeOptions: [],
    counters: [
      {
        title: "ICE side PNR",
        detail: "Force baseline and no middle.",
        coverage: "ice" as const,
        targetsPattern: "PNR",
        trigger: "On side ball screen",
        priority: "high" as const,
      },
    ],
    defensiveAdjustments: [],
    spacingFixes: [],
    timingCorrections: [],
  },
  disruption: {
    detected: true,
    coverage: "ice" as const,
    whatBroke: "ICE forced baseline on side PNR",
    suggestedRead: "reject",
    confidence: "high" as const,
  },
};

describe("film scout print model", () => {
  it("builds a single-clip scout read with deep link", () => {
    const model = buildFilmScoutPrintModel({
      session: {
        id: "film_sess_1",
        title: "vs Panathinaikos Q1",
        source: { kind: "upload", blobId: "b1", fileName: "game.mp4" },
      },
      origin: "https://fastcourt.eu",
      teamName: "Athens BC U18",
      footerText: "Confidential",
      clips: [
        {
          playheadTime: 92.4,
          result: sampleResult,
          coachTags: [{ kind: "pnr", time: 91.2, note: "Side" }],
        },
      ],
    });

    assert.match(model.reportTitle, /Scout read/);
    assert.match(model.reportTitle, /1:32/);
    assert.equal(model.clips.length, 1);
    assert.equal(model.chapters.length, 0);
    assert.equal(model.clips[0]?.tendencies[0]?.label, "Side ball screen");
    assert.equal(model.clips[0]?.coachTags[0]?.label, "PnR");
    assert.match(model.clips[0]?.clipLink ?? "", /film-room\?session=film_sess_1/);
    assert.match(model.clips[0]?.clipLink ?? "", /t=92/);
    assert.equal(model.clips[0]?.coachingSections[0]?.categoryId, "counters");
    assert.ok(model.clips[0]?.disruption?.headline);
    assert.equal(model.clips[0]?.disruption?.suggestedRead, "reject");
  });

  it("sorts session analyses by playhead time", () => {
    const session: FilmRoomSession = {
      id: "film_sess_2",
      title: "Full game",
      source: { kind: "youtube", videoId: "abc", originalUrl: "https://youtu.be/abc" },
      strokes: [],
      events: [],
      disruptions: [],
      bookmarks: [],
      analyses: [
        {
          id: "a2",
          playheadTime: 120,
          result: { ...sampleResult, summary: "Later clip" },
          frameCount: 10,
          coachTags: [],
          createdAt: 2,
        },
        {
          id: "a1",
          playheadTime: 45,
          result: { ...sampleResult, summary: "Early clip" },
          frameCount: 10,
          coachTags: [],
          createdAt: 1,
        },
      ],
      createdAt: 1,
      updatedAt: 2,
    };

    const model = buildFilmScoutPrintModelFromSessionAnalyses({
      session,
      origin: "https://fastcourt.eu",
      teamName: "",
      footerText: "",
    });

    assert.ok(model);
    assert.match(model!.reportTitle, /Scout report/);
    assert.equal(model!.clips.length, 2);
    assert.equal(model!.clips[0]?.summary, "Early clip");
    assert.equal(model!.clips[1]?.summary, "Later clip");
    assert.equal(model!.sourceLabel, "YouTube");
  });

  it("returns null when session has no analyses", () => {
    const session: FilmRoomSession = {
      id: "film_empty",
      title: "Empty",
      source: { kind: "upload", blobId: "x", fileName: "x.mp4" },
      strokes: [],
      events: [],
      disruptions: [],
      bookmarks: [],
      analyses: [],
      createdAt: 1,
      updatedAt: 1,
    };
    assert.equal(
      buildFilmScoutPrintModelFromSessionAnalyses({
        session,
        origin: "https://fastcourt.eu",
        teamName: "",
        footerText: "",
      }),
      null,
    );
  });

  it("formats generated-at label", () => {
    const label = formatFilmScoutGeneratedAt(Date.UTC(2026, 6, 4, 14, 30));
    assert.ok(label.length > 4);
    const block = buildFilmScoutPrintClipBlock("s1", "https://fastcourt.eu", {
      playheadTime: 0,
      result: sampleResult,
    });
    assert.equal(block.playheadLabel, "0:00");
  });
});
