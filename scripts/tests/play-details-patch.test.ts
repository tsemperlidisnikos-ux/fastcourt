import assert from "node:assert/strict";
import test from "node:test";
import { blankStoredPlay, patchStoredPlayFromDetails } from "@/lib/library/convert";

test("patchStoredPlayFromDetails updates series on stored play", () => {
  const play = {
    ...blankStoredPlay("Horns Flare"),
    series: "Offense",
    season: "2025-26",
    team: "Varsity",
    tags: ["ato"],
  };

  const updated = patchStoredPlayFromDetails(play, {
    type: "play",
    title: "Horns Flare",
    team: "Varsity",
    series: "Defense",
    tags: ["ato"],
    courtType: play.courtType,
    courtView: play.courtView,
    season: "2025-26",
    playNotes: "",
    videoUrl: "",
  });

  assert.equal(updated.series, "Defense");
  assert.equal(updated.frames.length, play.frames.length);
  assert.ok(updated.updatedAt >= play.updatedAt);
});
