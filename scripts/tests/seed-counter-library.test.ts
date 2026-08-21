import assert from "node:assert/strict";
import test from "node:test";
import {
  COUNTER_LIBRARY_SEED_IDS,
  COUNTER_LIBRARY_SEED_PLAYS,
  COUNTER_LIBRARY_SEED_SPECS,
} from "../../src/lib/library/starter-plays/seed-counter-library.ts";

test("counter library seed has 15 unique plays", () => {
  assert.equal(COUNTER_LIBRARY_SEED_IDS.length, 15);
  assert.equal(COUNTER_LIBRARY_SEED_PLAYS.length, 15);
  assert.equal(new Set(COUNTER_LIBRARY_SEED_IDS).size, 15);
});

test("every seed play is tagged Counter Library with coverage", () => {
  for (const play of COUNTER_LIBRARY_SEED_PLAYS) {
    assert.equal(play.defenseCounter?.enabled, true);
    assert.ok((play.defenseCounter?.coverages?.length ?? 0) > 0);
    assert.ok((play.defenseCounter?.vsPatterns?.length ?? 0) > 0);
    assert.ok(play.frames[0]?.objects.some((o) => o.kind === "offense"));
    assert.ok(play.frames[0]?.objects.some((o) => o.kind === "defense"));
    assert.ok(play.playNotes && play.playNotes.length > 20);
  }
});

test("seed specs cover core patterns", () => {
  const patterns = new Set(
    COUNTER_LIBRARY_SEED_SPECS.flatMap((spec) => spec.vsPatterns),
  );
  for (const needed of ["PNR", "Horns", "Spain", "DHO", "BLOB", "ISO", "Press"]) {
    assert.ok(patterns.has(needed), `missing pattern ${needed}`);
  }
});
