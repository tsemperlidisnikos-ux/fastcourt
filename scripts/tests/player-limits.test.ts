import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPlaceRosterPlayer,
  MAX_DEFENSE_PLAYERS,
  MAX_OFFENSE_PLAYERS,
  nextAvailableJersey,
} from "@/lib/designer/player-limits";
import { defense, offense } from "./helpers";

describe("player roster limits", () => {
  it("assigns jerseys 1–5 for offense", () => {
    const objects = [
      offense("o1", "1", 0.5, 0.5),
      offense("o2", "2", 0.4, 0.5),
      offense("o3", "3", 0.6, 0.5),
    ];
    assert.equal(nextAvailableJersey(objects, "offense"), "4");
  });

  it("returns null when offense roster is full", () => {
    const objects = Array.from({ length: MAX_OFFENSE_PLAYERS }, (_, i) =>
      offense(`o${i}`, String(i + 1), 0.5, 0.5),
    );
    assert.equal(nextAvailableJersey(objects, "offense"), null);
    assert.equal(canPlaceRosterPlayer(objects, "offense"), false);
  });

  it("allows up to MAX_DEFENSE_PLAYERS defenders", () => {
    const objects = Array.from({ length: MAX_DEFENSE_PLAYERS - 1 }, (_, i) =>
      defense(`d${i}`, `x${i + 1}`, 0.5, 0.5),
    );
    assert.equal(canPlaceRosterPlayer(objects, "defense"), true);
    objects.push(defense("dLast", "x5", 0.5, 0.5));
    assert.equal(canPlaceRosterPlayer(objects, "defense"), false);
  });

  it("always allows non-roster object kinds", () => {
    assert.equal(canPlaceRosterPlayer([], "cone"), true);
    assert.equal(canPlaceRosterPlayer([], "text"), true);
  });
});
