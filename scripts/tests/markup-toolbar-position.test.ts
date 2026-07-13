import assert from "node:assert/strict";
import {
  clampMarkupToolbarPosition,
  defaultMarkupToolbarPosition,
} from "../../src/lib/film-room/markup-toolbar-position.ts";

const boundsWidth = 960;
const boundsHeight = 540;
const toolbarWidth = 420;
const toolbarHeight = 58;

const start = defaultMarkupToolbarPosition(
  boundsWidth,
  boundsHeight,
  toolbarWidth,
  toolbarHeight,
);
assert.equal(start.x, (boundsWidth - toolbarWidth) / 2);
assert.equal(start.y, boundsHeight - toolbarHeight - 68);

const clamped = clampMarkupToolbarPosition(
  900,
  500,
  boundsWidth,
  boundsHeight,
  toolbarWidth,
  toolbarHeight,
);
assert.equal(clamped.x, boundsWidth - toolbarWidth);
assert.equal(clamped.y, boundsHeight - toolbarHeight);

console.log("markup-toolbar-position.test.ts OK");
