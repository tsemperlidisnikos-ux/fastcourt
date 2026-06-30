export interface PointStroke {
  points: number[];
}

function pointInsideEraser(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
) {
  return Math.hypot(px - cx, py - cy) <= radius;
}

function densifyPolyline(points: number[], step: number): [number, number][] {
  if (points.length < 2) return [];
  const out: [number, number][] = [[points[0], points[1]]];
  for (let i = 2; i < points.length; i += 2) {
    const x1 = points[i - 2];
    const y1 = points[i - 1];
    const x2 = points[i];
    const y2 = points[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    const steps = Math.max(1, Math.ceil(len / step));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push([x1 + dx * t, y1 + dy * t]);
    }
  }
  return out;
}

function appendRunPoint(run: number[], x: number, y: number) {
  if (run.length >= 2) {
    const lx = run[run.length - 2];
    const ly = run[run.length - 1];
    if (Math.hypot(x - lx, y - ly) < 1e-6) return;
  }
  run.push(x, y);
}

/** Split a polyline stroke, removing only the portion inside the eraser circle. */
export function erasePartialAtPoint<T extends PointStroke>(
  stroke: T,
  cx: number,
  cy: number,
  radius: number,
  sampleStep: number,
): T[] {
  const pts = stroke.points;
  if (pts.length < 2) return [stroke];

  if (pts.length === 2) {
    return pointInsideEraser(pts[0], pts[1], cx, cy, radius) ? [] : [stroke];
  }

  const step = Math.max(sampleStep, radius / 4, 1e-6);
  const dense = densifyPolyline(pts, step);
  if (dense.length === 0) return [stroke];

  const anyInside = dense.some(([px, py]) =>
    pointInsideEraser(px, py, cx, cy, radius),
  );
  if (!anyInside) return [stroke];

  const results: T[] = [];
  let run: number[] = [];

  const flush = () => {
    if (run.length >= 2) {
      results.push({ ...stroke, points: [...run] });
    }
    run = [];
  };

  for (const [px, py] of dense) {
    if (pointInsideEraser(px, py, cx, cy, radius)) {
      flush();
    } else {
      appendRunPoint(run, px, py);
    }
  }
  flush();

  return results;
}

export function eraseStrokesAt<T extends PointStroke>(
  strokes: T[],
  cx: number,
  cy: number,
  radius: number,
  sampleStep?: number,
): T[] {
  const step = sampleStep ?? Math.max(radius / 4, 1e-6);
  const out: T[] = [];
  for (const stroke of strokes) {
    out.push(...erasePartialAtPoint(stroke, cx, cy, radius, step));
  }
  return out;
}
