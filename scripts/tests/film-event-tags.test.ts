import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeFrameTimes,
  FILM_CLIP_ANALYZE_FRAME_COUNT,
  FILM_CLIP_ANALYZE_WINDOW_SEC,
} from "../../src/lib/film-room/capture-video-frames.ts";
import {
  formatFilmEventsForPrompt,
  normalizeFilmAnalyzeEvents,
  selectFilmEventsForAnalyze,
} from "../../src/lib/film-room/film-event-tags.ts";
import { normalizeFilmRoomSession } from "../../src/lib/film-room/film-room-session.ts";
import { buildFilmClipAnalyzePrompt } from "../../src/lib/film-room/film-clip-analyze-prompt.ts";

describe("film event tags (Level A)", () => {
  it("normalizes legacy sessions without events", () => {
    const session = normalizeFilmRoomSession({
      id: "film_1",
      title: "Q1",
      source: { kind: "direct", url: "https://example.com/a.mp4" },
      strokes: [],
      createdAt: 1,
      updatedAt: 1,
    } as Parameters<typeof normalizeFilmRoomSession>[0]);
    assert.deepEqual(session.events, []);
    assert.deepEqual(session.analyses, []);
  });

  it("selects events near analyze playhead", () => {
    const events = [
      { id: "a", kind: "pnr" as const, time: 10, createdAt: 1 },
      { id: "b", kind: "cut" as const, time: 12, createdAt: 1 },
      { id: "c", kind: "screen" as const, time: 30, createdAt: 1 },
    ];
    const picked = selectFilmEventsForAnalyze(events, 11, { radiusSec: 4 });
    assert.deepEqual(picked.map((row) => row.id), ["a", "b"]);
  });

  it("formats coach tags for AI prompt", () => {
    const text = formatFilmEventsForPrompt([
      { id: "1", kind: "pnr", time: 90, note: "Side ball screen", createdAt: 1 },
    ]);
    assert.match(text, /Coach-tagged events/);
    assert.match(text, /1:30/);
    assert.match(text, /PnR/);
    assert.match(text, /Side ball screen/);
  });

  it("normalizes analyze request events", () => {
    const rows = normalizeFilmAnalyzeEvents([
      { kind: "handoff", time: 5.2, note: "  DHO left  " },
      { kind: "invalid", time: 1 },
      { time: 2 },
    ]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.kind, "handoff");
    assert.equal(rows[0]?.note, "DHO left");
  });

  it("includes events in analyze prompt", () => {
    const prompt = buildFilmClipAnalyzePrompt(45, "Clip", {
      frameCount: 10,
      frameTimes: [44, 44.44, 44.89, 45.33, 45.78, 46.22, 46.67, 47.11, 47.56, 48],
      filmEvents: [{ id: "1", kind: "pnr", time: 44, createdAt: 1 }],
    });
    assert.match(prompt, /10 sequential frames/);
    assert.match(prompt, /Frame sequence sent/);
    assert.match(prompt, /Image 1:/);
    assert.match(prompt, /Coach-tagged events/);
    assert.match(prompt, /PnR/);
  });

  it("samples 10 frames across a 2s window", () => {
    const times = computeFrameTimes(50, 120, FILM_CLIP_ANALYZE_FRAME_COUNT, FILM_CLIP_ANALYZE_WINDOW_SEC);
    assert.equal(times.length, 10);
    assert.equal(times[0], 49);
    assert.equal(times[9], 51);
    assert.ok(times.every((t) => t >= 0 && t <= 119.95));
  });
});

describe("film analyze context", () => {
  it("formats source line with frames and tags", async () => {
    const {
      formatFilmAnalyzeSourceLine,
      formatFilmAnalyzeTagsSummary,
      formatFrameSequenceForPrompt,
      buildFilmAnalyzeContext,
    } = await import("../../src/lib/film-room/film-analyze-context.ts");
    const line = formatFilmAnalyzeSourceLine({
      frameCount: 10,
      frameTimes: [49, 49.22, 49.44, 49.67, 49.89, 50.11, 50.33, 50.56, 50.78, 51],
      coachTags: [{ id: "1", kind: "pnr", time: 44, note: "Side", createdAt: 1 }],
    });
    assert.match(line, /10 frames/);
    assert.match(line, /1 coach tag/);
    const tags = formatFilmAnalyzeTagsSummary([
      { id: "1", kind: "handoff", time: 12, createdAt: 1 },
    ]);
    assert.match(tags, /0:12/);
    assert.match(tags, /Handoff/);
    const frames = formatFrameSequenceForPrompt(50, [49, 50, 51]);
    assert.match(frames, /Image 1:/);
    assert.match(frames, /-1.00s from playhead/);
    assert.equal(buildFilmAnalyzeContext([], [49, 50]).frameTimes.length, 2);
  });

  it("merges coach tags into scouting notes", async () => {
    const { mergeCoachTagsIntoScoutingNotes } = await import(
      "../../src/lib/film-room/film-event-tags.ts"
    );
    const merged = mergeCoachTagsIntoScoutingNotes(
      "Existing.",
      [{ id: "1", kind: "pnr", time: 44, note: "Side", createdAt: 1 }],
      "Q1 clip",
      45,
    );
    assert.match(merged, /Existing/);
    assert.match(merged, /Coach tags/);
    assert.match(merged, /0:44 PnR — Side/);
  });
});
