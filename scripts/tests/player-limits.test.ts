import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canPlaceBall,
  canPlaceRosterPlayer,
  countBallMarkers,
  countRoster,
  formatDefenseDisplayLabel,
  nextAvailableJersey,
  normalizeDefenseLabel,
  reconcileRosterLabels,
} from "../../src/lib/designer/player-limits.ts";
import type { DesignerObject } from "../../src/types/designer.ts";

function offense(id: string, label: string, hasBall = false): DesignerObject {
  return { id, kind: "offense", x: 0.5, y: 0.5, label, hasBall };
}

function defense(id: string, label: string): DesignerObject {
  return { id, kind: "defense", x: 0.5, y: 0.5, label };
}

describe("defense roster labels", () => {
  it("normalizes X-prefix labels to digits", () => {
    assert.equal(normalizeDefenseLabel("X1"), "1");
    assert.equal(normalizeDefenseLabel("x3"), "3");
    assert.equal(formatDefenseDisplayLabel("1"), "X1");
    assert.equal(formatDefenseDisplayLabel("X2"), "X2");
  });

  it("assigns jerseys 1–5 in order", () => {
    const objects: DesignerObject[] = [];
    assert.equal(nextAvailableJersey(objects, "defense"), "1");
    objects.push(defense("d1", "X1"));
    assert.equal(nextAvailableJersey(objects, "defense"), "2");
    objects.push(defense("d2", "2"));
    assert.equal(nextAvailableJersey(objects, "defense"), "3");
  });

  it("reconciles lone X defense labels to digits", () => {
    const objects = [
      defense("d1", "X"),
      defense("d2", "X"),
      defense("d3", "3"),
    ];
    const reconciled = reconcileRosterLabels(objects);
    assert.equal(reconciled[0].label, "1");
    assert.equal(reconciled[1].label, "2");
    assert.equal(reconciled[2].label, "3");
    assert.equal(formatDefenseDisplayLabel(reconciled[0].label), "X1");
    assert.equal(formatDefenseDisplayLabel(reconciled[1].label), "X2");
  });

  it("does not treat lone X labels as occupied jersey slots", () => {
    const objects = [defense("d1", "X"), defense("d2", "X")];
    assert.equal(nextAvailableJersey(objects, "defense"), "1");
    objects.push(defense("d3", "1"));
    assert.equal(nextAvailableJersey(objects, "defense"), "2");
  });

  it("allows up to 20 roster players in drill mode", () => {
    const objects: DesignerObject[] = [];
    for (let n = 1; n <= 20; n++) {
      objects.push(offense(`o${n}`, String(n)));
    }
    assert.equal(countRoster(objects, "offense"), 20);
    assert.equal(canPlaceRosterPlayer(objects, "offense", "drill"), false);
    assert.equal(nextAvailableJersey(objects, "offense", "drill"), null);
  });

  it("allows up to 20 ball markers in drill mode", () => {
    const objects: DesignerObject[] = [
      offense("o1", "1", true),
      offense("o2", "2", true),
      { id: "b1", kind: "ball", x: 0.2, y: 0.2 },
    ];
    assert.equal(countBallMarkers(objects, "drill"), 3);
    assert.equal(canPlaceBall(objects, "drill"), true);
    const full = Array.from({ length: 17 }, (_, i) =>
      offense(`o${i + 3}`, String(i + 3), true),
    );
    const crowded = [...objects, ...full];
    assert.equal(countBallMarkers(crowded, "drill"), 20);
    assert.equal(canPlaceBall(crowded, "drill"), false);
  });
});
