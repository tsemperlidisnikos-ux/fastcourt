import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDrillSuggestions } from "../../src/lib/practice/drill-suggestions.ts";
import {
  buildPossessionReelManifest,
  formatPossessionReelCutList,
} from "../../src/lib/film-room/possession-reel-export.ts";
import { buildPossessionPlaylist } from "../../src/lib/film-room/film-possession-playlist.ts";
import { createFilmBookmark } from "../../src/lib/film-room/film-room-bookmarks.ts";

describe("drill-suggestions", () => {
  it("suggests extra blocks for high miss-rate reads", () => {
    const suggestions = buildDrillSuggestions(
      [
        {
          id: "s1",
          date: "2026-07-05",
          title: "Reads",
          team: "Varsity",
          items: [
            { id: "a", durationMin: 10, liveCall: "Snake", readOutcome: "missed" },
            { id: "b", durationMin: 10, liveCall: "Snake", readOutcome: "missed" },
            { id: "c", durationMin: 10, liveCall: "Snake", readOutcome: "landed" },
          ],
          createdAt: "",
          updatedAt: "",
        },
      ],
      [],
    );
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0]?.call, "Snake");
    assert.ok((suggestions[0]?.suggestedBlocks ?? 0) >= 1);
  });
});

describe("possession-reel-export", () => {
  it("builds reel segments with deep links", () => {
    const items = buildPossessionPlaylist(
      [
        createFilmBookmark(30, "Plan broke here", "ICE", "disruption"),
        createFilmBookmark(90, "ATO", undefined, "chapter"),
      ],
      "all",
    );
    const manifest = buildPossessionReelManifest({
      sessionId: "film1",
      sessionTitle: "Game film",
      source: { kind: "youtube", videoId: "abc", originalUrl: "https://youtu.be/abc" },
      origin: "https://fastcourt.eu",
      items,
      videoDuration: 600,
    });
    assert.equal(manifest.segmentCount, 2);
    assert.match(manifest.segments[0]?.deepLink ?? "", /film-room\?session=film1/);
    assert.match(formatPossessionReelCutList(manifest), /Plan broke here/);
  });
});
