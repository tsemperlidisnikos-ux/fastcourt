import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildStandaloneReelHtml } from "../../src/lib/film-room/film-reel-html-export.ts";
import { buildFilmScoutPrintModelFromSession } from "../../src/lib/film-room/film-scout-print-model.ts";
import { createFilmBookmark } from "../../src/lib/film-room/film-room-bookmarks.ts";

describe("film-reel-polish", () => {
  it("builds standalone reel html", () => {
    const html = buildStandaloneReelHtml({
      version: 1,
      sessionId: "film1",
      sessionTitle: "Game film",
      sourceKind: "youtube",
      generatedAt: "2026-07-05",
      segmentCount: 1,
      segments: [
        {
          index: 1,
          bookmarkId: "b1",
          label: "Plan broke here",
          kind: "disruption",
          startSec: 28,
          endSec: 40,
          durationSec: 12,
          timeLabel: "0:30",
          deepLink: "https://fastcourt.eu/film-room?session=film1&t=30",
        },
      ],
    });
    assert.match(html, /Plan broke here/);
    assert.match(html, /<!DOCTYPE html>/i);
  });

  it("adds evaluation and reel to scout session pdf model", () => {
    const model = buildFilmScoutPrintModelFromSession({
      session: {
        id: "film1",
        title: "Scout",
        source: { kind: "youtube", videoId: "abc", originalUrl: "https://youtu.be/abc" },
        strokes: [],
        events: [],
        disruptions: [],
        bookmarks: [createFilmBookmark(30, "Plan broke here", undefined, "disruption")],
        analyses: [
          {
            id: "a1",
            playheadTime: 30,
            frameCount: 10,
            coachTags: [],
            createdAt: 1,
            result: {
              summary: "ICE",
              tendencies: [],
              playPatterns: [],
              coaching: {
                alternativeOptions: [],
                counters: [],
                defensiveAdjustments: [],
                spacingFixes: [],
                timingCorrections: [],
              },
              disruption: { detected: true, coverage: "ice", suggestedRead: "reject" },
            },
          },
        ],
        createdAt: 1,
        updatedAt: 1,
      },
      origin: "https://fastcourt.eu",
      teamName: "Varsity",
      footerText: "FastCourt",
      videoDuration: 600,
      reelShareLink: "https://fastcourt.eu/#s=abc",
    });
    assert.ok(model?.evaluation);
    assert.ok(model?.reelSegments?.length);
    assert.equal(model?.reelShareLink, "https://fastcourt.eu/#s=abc");
  });
});
