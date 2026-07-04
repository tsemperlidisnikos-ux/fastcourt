import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDesignerHref, parseDesignerFrameParam, resolvePlayFrameLinks } from "../../src/lib/designer/designer-deep-link.ts";
import { parseFilmClipAiDisruption } from "../../src/lib/film-room/film-ai-disruption-parse.ts";
import { comparePlayIdealToDisruption } from "../../src/lib/film-room/film-play-ideal-compare.ts";
import { detectFilmDisruption } from "../../src/lib/film-room/film-disruption-detector.ts";
import type { StoredPlay } from "../../src/types/library.ts";

describe("designer-deep-link", () => {
  it("builds href with frame index", () => {
    assert.equal(
      buildDesignerHref("play_1", 2),
      "/designer?item=play_1&frame=2",
    );
    assert.equal(parseDesignerFrameParam("3"), 3);
  });

  it("resolves primary and read frames", () => {
    const frames = [
      { id: "f1" },
      { id: "f2", readBranch: { coverage: "ice", parentFrameId: "f1" } },
    ];
    const links = resolvePlayFrameLinks(frames, "ice");
    assert.equal(links.primaryFrameIndex, 0);
    assert.equal(links.readFrameIndex, 1);
  });
});

describe("film-ai-disruption-parse", () => {
  it("parses detected disruption", () => {
    const row = parseFilmClipAiDisruption({
      detected: true,
      coverage: "ice",
      whatBroke: "ICE forced baseline on side PNR",
      suggestedRead: "reject",
      confidence: "high",
    });
    assert.equal(row?.detected, true);
    assert.equal(row?.coverage, "ice");
    assert.equal(row?.suggestedRead, "reject");
  });
});

describe("film-play-ideal-compare", () => {
  const play: StoredPlay = {
    id: "p1",
    title: "Horns PNR",
    type: "play",
    tags: ["horns", "pnr"],
    frames: [
      { id: "f1", name: "Entry", objects: [], actions: [] },
      {
        id: "f2",
        name: "Reject",
        objects: [],
        actions: [],
        readBranch: { label: "If ICE", coverage: "ice", parentFrameId: "f1" },
      },
    ],
    courtType: "half",
    createdAt: "",
    updatedAt: "",
  };

  it("flags mismatch when AI sees disruption", () => {
    const compare = comparePlayIdealToDisruption(play, {
      summary: "ICE side",
      tendencies: [{ kind: "halfcourt", label: "Half", confidence: 0.8 }],
      playPatterns: [{ tag: "PNR", confidence: 0.9 }],
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
        whatBroke: "ICE denied middle",
        suggestedRead: "reject",
      },
    });
    assert.equal(compare.aligned, false);
    assert.equal(compare.readFrameIndex, 1);
    assert.match(compare.mismatchNote ?? "", /ICE denied middle/i);
  });
});

describe("detectFilmDisruption with AI", () => {
  it("uses AI disruption when no coach tags", () => {
    const result = detectFilmDisruption({
      playPatterns: [{ tag: "Horns", confidence: 0.8 }],
      aiDisruption: {
        detected: true,
        coverage: "switch",
        whatBroke: "Early switch killed the slip",
        suggestedRead: "slip",
      },
    });
    assert.equal(result.detected, true);
    assert.match(result.reason, /Early switch/i);
  });
});
