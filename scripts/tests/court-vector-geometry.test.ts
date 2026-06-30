import assert from "node:assert/strict";
import {
  buildCourtVectorGeometry,
  countHgElements,
  courtLengthFt,
} from "@/lib/designer/court-vector-geometry";
import type { CourtTemplate } from "@/types/designer";
import { getCourtAspect, getCourtHgTemplate } from "@/lib/designer/court-hg-templates";

const TEMPLATE_COUNTS: Record<CourtTemplate, { full: number; half: number }> = {
  NCAA: { full: 33, half: 17 },
  NBA: { full: 35, half: 18 },
  FIBA: { full: 39, half: 20 },
  HighSchool: { full: 31, half: 16 },
};

function testNcaaHalfCourtGeometry() {
  assert.equal(courtLengthFt("half", "NCAA"), 47);
  assert.equal(countHgElements("half", undefined, "NCAA"), TEMPLATE_COUNTS.NCAA.half);
  const half = buildCourtVectorGeometry("half", 0, 0, 500, 470, undefined, "NCAA");
  assert.ok(half.lines.length >= 6);
  assert.ok(half.paths.length >= 4);
  const dashedLines = half.lines.filter((l) => l.dashed);
  const dashedPaths = half.paths.filter((p) => p.dashed);
  assert.equal(dashedLines.length + dashedPaths.length, 0);
  const paint = half.paths.filter((p) => p.fill);
  assert.equal(paint.length, 1);
}

function testNcaaFullCourtGeometry() {
  const full = buildCourtVectorGeometry("full", 0, 0, 500, 940, undefined, "NCAA");
  const fullThinCenter = buildCourtVectorGeometry(
    "full",
    0,
    0,
    500,
    940,
    undefined,
    "NCAA",
    true,
  );
  assert.equal(courtLengthFt("full", "NCAA"), 94);
  assert.ok(
    full.lines.length >
      buildCourtVectorGeometry("half", 0, 0, 500, 470, undefined, "NCAA").lines.length,
  );
  assert.ok(
    full.paths.length >
      buildCourtVectorGeometry("half", 0, 0, 500, 470, undefined, "NCAA").paths.length,
  );
  const center = fullThinCenter.paths.find(
    (p) => !p.fill && p.strokeWidthScale === 0.5,
  );
  assert.ok(center);
  assert.ok(center!.d.includes("L"));
  const centerDefault = full.paths.find((p) => p.strokeWidthScale === 0.5);
  assert.equal(centerDefault, undefined);
  const paint = full.paths.filter((p) => p.fill);
  assert.equal(paint.length, 2);
}

function testAllTemplates() {
  for (const [template, counts] of Object.entries(TEMPLATE_COUNTS) as Array<
    [CourtTemplate, { full: number; half: number }]
  >) {
    assert.equal(countHgElements("full", undefined, template), counts.full);
    assert.equal(countHgElements("half", undefined, template), counts.half);
    const lengthFt = courtLengthFt("full", template);
    const widthFt =
      template === "FIBA" ? 49.21 : 50;
    const geom = buildCourtVectorGeometry(
      "full",
      0,
      0,
      widthFt * 10,
      lengthFt * 10,
      undefined,
      template,
    );
    assert.equal(geom.lengthFt, lengthFt);
    assert.ok(geom.lines.length > 0);
    assert.ok(geom.paths.length > 0);
  }
}

function testUniformCourtScale() {
  const templates: CourtTemplate[] = ["NCAA", "NBA", "FIBA", "HighSchool"];
  for (const template of templates) {
    const spec = getCourtHgTemplate(template);
    const lengthFt = spec.fullLengthFt / 2;
    const aspect = getCourtAspect(template, "half");
    const courtW = 500;
    const courtH = courtW / aspect;
    const scaleX = courtW / spec.widthFt;
    const scaleY = courtH / lengthFt;
    assert.ok(Math.abs(scaleX - scaleY) < 0.001, `${template} scale mismatch`);
    assert.ok(Math.abs(courtW / courtH - spec.widthFt / lengthFt) < 0.001);
  }
}

testNcaaHalfCourtGeometry();
testNcaaFullCourtGeometry();
testAllTemplates();
testUniformCourtScale();
console.log("court-vector-geometry.test: ok");
