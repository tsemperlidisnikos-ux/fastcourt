import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatPracticeLiveCall,
  resolvePracticeDisruptionCue,
} from "../../src/lib/practice/practice-disruption-cue.ts";

describe("practice-disruption-cue", () => {
  it("prefers structured liveCall over parsed notes", () => {
    const cue = resolvePracticeDisruptionCue({
      id: "pi_1",
      durationMin: 8,
      liveCall: "Reject / snake",
      notes: "Film read: ICE · Read: Slip",
    });
    assert.equal(formatPracticeLiveCall(cue!), "Reject / snake");
  });

  it("parses film read and broke from notes", () => {
    const cue = resolvePracticeDisruptionCue({
      id: "pi_2",
      durationMin: 8,
      notes: "Film read: ICE denied middle · Read: Reject · Broke: No reject lane",
      designerFrameIndex: 2,
    });
    assert.ok(cue);
    assert.equal(cue?.filmRead, "ICE denied middle");
    assert.equal(cue?.readDetail, "Reject");
    assert.equal(cue?.broke, "No reject lane");
    assert.equal(cue?.designerFrameIndex, 2);
    assert.equal(formatPracticeLiveCall(cue!), "Reject");
  });

  it("returns null for plain notes", () => {
    const cue = resolvePracticeDisruptionCue({
      id: "pi_3",
      durationMin: 10,
      notes: "Focus on spacing",
    });
    assert.equal(cue, null);
  });
});
