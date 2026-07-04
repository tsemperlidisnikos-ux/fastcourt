import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDisruptionPracticeEntries,
  buildDisruptionPracticeNotes,
} from "../../src/lib/film-room/film-practice-disruption.ts";
import { detectFilmDisruption } from "../../src/lib/film-room/film-disruption-detector.ts";
import type { StoredPlay } from "../../src/types/library.ts";

describe("film-practice-disruption", () => {
  const play: StoredPlay = {
    id: "p1",
    title: "Horns Reject",
    type: "play",
    tags: ["reject", "horns"],
    frames: [],
    courtType: "half",
    createdAt: "",
    updatedAt: "",
  };

  const analysis = {
    summary: "ICE side",
    tendencies: [{ kind: "halfcourt" as const, label: "Half", confidence: 0.8 }],
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
      coverage: "ice" as const,
      whatBroke: "ICE denied middle",
      suggestedRead: "reject",
    },
  };

  it("builds practice notes from disruption context", () => {
    const assessment = detectFilmDisruption({
      playPatterns: analysis.playPatterns,
      aiDisruption: analysis.disruption,
    });
    const notes = buildDisruptionPracticeNotes(
      { play, score: 10, reasons: [], readLabel: "Reject / snake" },
      assessment,
      analysis,
    );
    assert.match(notes, /ICE/i);
    assert.match(notes, /Reject/i);
  });

  it("builds practice entries for matched plays", () => {
    const assessment = detectFilmDisruption({
      playPatterns: analysis.playPatterns,
      aiDisruption: analysis.disruption,
    });
    const entries = buildDisruptionPracticeEntries(
      [{ play, score: 10, reasons: [], readLabel: "Reject / snake" }],
      assessment,
      analysis,
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.playId, "p1");
    assert.equal(entries[0]?.durationMin, 8);
  });
});
