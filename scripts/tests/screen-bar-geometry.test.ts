import assert from "node:assert/strict";
import {
  actionToStagePoints,
  screenBarPointsFromPolyline,
} from "@/lib/designer/action-geometry";
import type { DesignerAction } from "@/types/designer";

function makeScreen(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  midX?: number,
  midY?: number,
): DesignerAction {
  return {
    id: "sc1",
    type: "screen",
    x1,
    y1,
    x2,
    y2,
    midX: midX ?? (x1 + x2) / 2,
    midY: midY ?? (y1 + y2) / 2,
    strokeWidth: 2,
    timing: "normal",
  };
}

const court = { x: 0, y: 0, width: 500, height: 470 };

function endTangent(points: number[]) {
  const n = points.length;
  const ex = points[n - 2];
  const ey = points[n - 1];
  for (let i = n - 4; i >= 0; i -= 2) {
    const dx = ex - points[i];
    const dy = ey - points[i + 1];
    const len = Math.hypot(dx, dy);
    if (len >= 1e-3) return { tx: dx / len, ty: dy / len };
  }
  const dx = ex - points[0];
  const dy = ey - points[1];
  const len = Math.hypot(dx, dy) || 1;
  return { tx: dx / len, ty: dy / len };
}

function testScreenBarPerpendicularToEndTangent() {
  const stem = [100, 376, 150, 340, 200, 280, 250, 188];
  const bar = screenBarPointsFromPolyline(stem, court, 20);
  const { tx, ty } = endTangent(stem);
  const barDx = bar[2] - bar[0];
  const barDy = bar[3] - bar[1];
  const dot = barDx * tx + barDy * ty;
  assert.ok(Math.abs(dot) < 0.5, "bar should be perpendicular to stem at screening spot");
}

function testCurvedScreenBarPerpendicularToSampledStem() {
  const action: DesignerAction = {
    id: "sc1",
    type: "screen",
    x1: 100 / 500,
    y1: 376 / 470,
    x2: 250 / 500,
    y2: 188 / 470,
    c1x: 120 / 500,
    c1y: 360 / 470,
    c2x: 230 / 500,
    c2y: 200 / 470,
    midX: 175 / 500,
    midY: 280 / 470,
    strokeWidth: 2,
    timing: "normal",
  };
  const stem = actionToStagePoints(action, court, "half", "vector");
  const bar = screenBarPointsFromPolyline(stem, court, 20);
  const { tx, ty } = endTangent(stem);
  const barDx = bar[2] - bar[0];
  const barDy = bar[3] - bar[1];
  const dot = barDx * tx + barDy * ty;
  assert.ok(Math.abs(dot) < 0.5, "sampled curved stem bar should be perpendicular at end");
}

function testScreenBarStableSideOnCurve() {
  const stem = [100, 376, 150, 340, 200, 280, 250, 188];
  const bar = screenBarPointsFromPolyline(stem, court, 20);
  const ex = stem[stem.length - 2];
  const ey = stem[stem.length - 1];
  const { tx, ty } = endTangent(stem);
  const midFlatIdx = Math.floor((stem.length - 2) / 2);
  const mi = midFlatIdx % 2 === 0 ? midFlatIdx : midFlatIdx - 1;
  const cross = tx * (stem[mi + 1] - ey) - ty * (stem[mi] - ex);
  const nx = -ty;
  const ny = tx;
  const barOff = (bar[0] - ex) * nx + (bar[1] - ey) * ny;
  assert.ok(Math.abs(cross) > 0.001);
  assert.ok(cross * barOff < 0, "bar should open opposite to curve bulge");
}

function testStraightScreenBarUsesTangent() {
  const action = makeScreen(0.1, 0.5, 0.9, 0.5);
  const stem = actionToStagePoints(action, court, "half", "vector");
  const bar = screenBarPointsFromPolyline(stem, court, 20);
  const ex = stem[stem.length - 2];
  const ey = stem[stem.length - 1];
  const perpDist = Math.hypot(bar[0] - ex, bar[1] - ey);
  assert.ok(perpDist > 5, "screen bar should extend perpendicular to stem");
}

testScreenBarPerpendicularToEndTangent();
testCurvedScreenBarPerpendicularToSampledStem();
testScreenBarStableSideOnCurve();
testStraightScreenBarUsesTangent();
console.log("screen-bar-geometry.test: ok");
