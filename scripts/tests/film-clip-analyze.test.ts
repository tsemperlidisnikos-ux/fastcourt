import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFilmClipAnalyzePrompt,
  parseCoachingRecommendations,
  parseFilmClipAnalysisPayload,
} from "../../src/lib/film-room/film-clip-analyze-prompt.ts";
import { formatCoachingForScoutingNotes } from "../../src/lib/film-room/film-coaching-format.ts";
import {
  allCoachingCueKeys,
  coachingCueKey,
  filterCoachingBySelectedKeys,
} from "../../src/lib/film-room/film-coaching-format.ts";

describe("film clip analyze", () => {
  it("builds prompt with timestamp and title", () => {
    const prompt = buildFilmClipAnalyzePrompt(90, "Q1 vs Panathinaikos", { frameCount: 10 });
    assert.match(prompt, /90s/);
    assert.match(prompt, /Panathinaikos/);
    assert.match(prompt, /10 sequential frames/);
    assert.match(prompt, /JSON only/);
    assert.match(prompt, /alternativeOptions/);
    assert.match(prompt, /spacingFixes/);
    assert.match(prompt, /timingCorrections/);
  });

  it("parses valid AI payload", () => {
    const result = parseFilmClipAnalysisPayload({
      summary: "They set up a 2-3 zone look after the pass.",
      tendencies: [
        {
          kind: "zone",
          label: "Zone offense",
          confidence: 0.82,
          notes: "Flat defenders along the lane",
        },
      ],
      playPatterns: [{ tag: "Horns", confidence: 0.7, notes: "High double gap" }],
      coaching: {
        counters: [
          {
            title: "Blitz ball screen",
            detail: "Send nail help early and trap the roller side.",
            coverage: "blitz",
            targetsPattern: "PNR",
            trigger: "On side PNR",
            ballHandlerRule: "Force sideline",
            screenerRule: "Trap with big",
            weakPoint: "Open corner three",
            priority: "high",
          },
        ],
        spacingFixes: [
          {
            title: "Shrink corner gap",
            detail: "X3 one step closer to the slot before the pass.",
          },
        ],
      },
    });
    assert.ok(result);
    assert.equal(result!.tendencies.length, 1);
    assert.equal(result!.tendencies[0]?.kind, "zone");
    assert.equal(result!.playPatterns.length, 1);
    assert.equal(result!.playPatterns[0]?.tag, "Horns");
    assert.equal(result!.coaching.counters.length, 1);
    assert.equal(result!.coaching.counters[0]?.title, "Blitz ball screen");
    assert.equal(result!.coaching.counters[0]?.coverage, "blitz");
    assert.equal(result!.coaching.counters[0]?.targetsPattern, "PNR");
    assert.equal(result!.coaching.spacingFixes.length, 1);
  });

  it("formats coaching for scouting notes", () => {
    const text = formatCoachingForScoutingNotes(
      {
        alternativeOptions: [],
        counters: [{ title: "ICE", detail: "Force baseline." }],
        defensiveAdjustments: [],
        spacingFixes: [],
        timingCorrections: [],
      },
      "Q1 clip",
      90,
    );
    assert.match(text, /AI Coaching/);
    assert.match(text, /Counters/);
    assert.match(text, /ICE/);
  });

  it("filters coaching by selected cue keys", () => {
    const coaching = {
      alternativeOptions: [],
      counters: [
        { title: "ICE", detail: "Force baseline.", coverage: "ice", targetsPattern: "PNR" },
        { title: "Blitz", detail: "Trap side.", coverage: "blitz", targetsPattern: "PNR" },
      ],
      defensiveAdjustments: [],
      spacingFixes: [{ title: "Gap", detail: "Shrink nail." }],
      timingCorrections: [],
    };
    const keys = allCoachingCueKeys(coaching);
    assert.equal(keys.length, 3);
    const filtered = filterCoachingBySelectedKeys(
      coaching,
      new Set([coachingCueKey("counters", 0), coachingCueKey("spacingFixes", 0)]),
    );
    assert.equal(filtered.counters.length, 1);
    assert.equal(filtered.counters[0]?.title, "ICE");
    assert.equal(filtered.spacingFixes.length, 1);
    assert.equal(filtered.counters[1], undefined);
  });

  it("normalizes unknown kind to other", () => {
    const result = parseFilmClipAnalysisPayload({
      summary: "Unclear half-court set.",
      tendencies: [
        {
          kind: "horns",
          label: "Horns",
          confidence: 1.5,
          notes: "High pick",
        },
      ],
    });
    assert.ok(result);
    assert.equal(result!.tendencies[0]?.kind, "other");
    assert.equal(result!.tendencies[0]?.confidence, 1);
  });

  it("rejects empty summary", () => {
    assert.equal(
      parseFilmClipAnalysisPayload({ summary: "", tendencies: [] }),
      null,
    );
  });
});
