import assert from "node:assert/strict";
import test from "node:test";
import {
  canAddItemToPlaybook,
  filterPlaybookEligibleItems,
  formatCounterLibraryBadgeLabel,
  formatCounterLibraryBadgeTitle,
  isCounterLibraryItem,
} from "../../src/lib/library/counter-library-badge.ts";

test("counter library badge helpers", () => {
  assert.equal(isCounterLibraryItem({ defenseCounter: { enabled: true, coverages: [], vsPatterns: [] } }), true);
  assert.equal(isCounterLibraryItem({ defenseCounter: { enabled: false, coverages: [], vsPatterns: [] } }), false);
  assert.equal(isCounterLibraryItem({ tags: ["counter", "defense"] }), true);
  assert.equal(isCounterLibraryItem({ tags: ["offense"] }), false);
  assert.equal(canAddItemToPlaybook({ defenseCounter: { enabled: true, coverages: ["ice"], vsPatterns: ["PNR"] } }), false);
  assert.equal(canAddItemToPlaybook({ type: "play", tags: ["offense"] }), true);
  assert.deepEqual(
    filterPlaybookEligibleItems([
      { type: "play", tags: ["offense"], defenseCounter: { enabled: false, coverages: [], vsPatterns: [] } },
      { type: "play", tags: ["counter"], defenseCounter: { enabled: true, coverages: ["ice"], vsPatterns: ["PNR"] } },
      { type: "playbook" },
    ]).map((item) => item.type),
    ["play"],
  );
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
