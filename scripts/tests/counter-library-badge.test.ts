import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCounterLibraryBadgeLabel,
  formatCounterLibraryBadgeTitle,
  isCounterLibraryItem,
} from "../../src/lib/library/counter-library-badge.ts";

test("counter library badge helpers", () => {
  assert.equal(isCounterLibraryItem({ defenseCounter: { enabled: true, coverages: [], vsPatterns: [] } }), true);
  assert.equal(isCounterLibraryItem({ defenseCounter: { enabled: false, coverages: [], vsPatterns: [] } }), false);
  assert.equal(
    formatCounterLibraryBadgeLabel({
      enabled: true,
      coverages: ["ice"],
      vsPatterns: ["PNR"],
    }),
    "Counter · ICE",
  );
  assert.ok(
    formatCounterLibraryBadgeTitle({
      enabled: true,
      coverages: ["ice"],
      vsPatterns: ["PNR"],
    }).includes("vs PNR"),
  );
});
