import assert from "node:assert/strict";
import { buildWoodTileRects, HG_WOOD_PLANK_WIDTH_FT } from "@/lib/designer/court-wood-tiles";
import { getCourtHgTemplate } from "@/lib/designer/court-hg-templates";

function testWoodTiles() {
  const spec = getCourtHgTemplate("NCAA");
  const planks = buildWoodTileRects(0, 0, 500, 470, spec.widthFt, "rgb(219, 192, 151)");
  const expected = Math.ceil(spec.widthFt / HG_WOOD_PLANK_WIDTH_FT);
  assert.equal(planks.length, expected);
  assert.ok(planks[0].fill.startsWith("rgb"));
  assert.notEqual(planks[0].fill, planks[1].fill);
}

function testTemplateDimensions() {
  assert.equal(getCourtHgTemplate("NBA").fullLengthFt, 94);
  assert.equal(getCourtHgTemplate("FIBA").widthFt, 49.21);
  assert.equal(getCourtHgTemplate("HighSchool").fullLengthFt, 84);
  assert.equal(getCourtHgTemplate("NCAA").backboardBaselineFt, 4);
}

testWoodTiles();
testTemplateDimensions();
console.log("court-hg-visual.test: ok");
