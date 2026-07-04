import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectFilmDisruption } from "../../src/lib/film-room/film-disruption-detector.ts";
import {
  selectFilmDisruptionsForAnalyze,
  normalizeFilmDisruptionKind,
} from "../../src/lib/film-room/film-disruption-tags.ts";
import { suggestOffensePlaysForDisruption } from "../../src/lib/film-room/film-offense-variation-match.ts";
import type { StoredPlay } from "../../src/types/library.ts";

describe("film-disruption-tags", () => {
  it("normalizes disruption kinds", () => {
    assert.equal(normalizeFilmDisruptionKind("top-lock"), "top_lock");
    assert.equal(normalizeFilmDisruptionKind("ICE"), "ice");
    assert.equal(normalizeFilmDisruptionKind("unknown"), null);
  });

  it("selects disruptions near playhead", () => {
    const rows = selectFilmDisruptionsForAnalyze(
      [
        {
          id: "a",
          kind: "hedge",
          time: 10,
          createdAt: 1,
        },
        {
          id: "b",
          kind: "switch",
          time: 20,
          createdAt: 2,
        },
      ],
      10.5,
      { radiusSec: 2 },
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.kind, "hedge");
  });
});

describe("film-disruption-detector", () => {
  it("detects disruption from coach tag + pattern", () => {
    const result = detectFilmDisruption({
      disruptionTags: [
        { id: "1", kind: "ice", time: 12, createdAt: 1 },
      ],
      playPatterns: [{ tag: "PNR", confidence: 0.9 }],
      counters: [],
    });
    assert.equal(result.detected, true);
    assert.match(result.headline, /PNR|ICE/i);
    assert.ok(result.suggestedReads.some((read) => /reject|snake/i.test(read.label)));
  });

  it("returns empty state when no signals", () => {
    const result = detectFilmDisruption({});
    assert.equal(result.detected, false);
    assert.equal(result.suggestedReads.length, 0);
  });
});

describe("film-offense-variation-match", () => {
  const plays: StoredPlay[] = [
    {
      id: "p1",
      title: "Horns Reject ICE",
      type: "play",
      tags: ["horns", "reject"],
      frames: [],
      courtType: "half",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "p2",
      title: "Zone Defense ICE",
      type: "play",
      tags: ["defense", "ice"],
      frames: [],
      courtType: "half",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("matches offense variation plays, not defense", () => {
    const assessment = detectFilmDisruption({
      disruptionTags: [{ id: "1", kind: "ice", time: 1, createdAt: 1 }],
      playPatterns: [{ tag: "Horns", confidence: 0.8 }],
    });
    const matches = suggestOffensePlaysForDisruption(
      plays,
      assessment.suggestedReads,
      new Set(),
      "Horns",
      3,
    );
    assert.ok(matches.some((row) => row.play.id === "p1"));
    assert.ok(!matches.some((row) => row.play.id === "p2"));
  });
});
