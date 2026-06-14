import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contrastingTextOnBackground,
  resolveHeaderNavActiveTextColor,
} from "../../src/lib/settings/color-contrast.ts";

describe("color contrast", () => {
  it("uses white text on dark green active tab", () => {
    assert.equal(resolveHeaderNavActiveTextColor("#16a34a"), "#ffffff");
  });

  it("uses dark text on light yellow active tab", () => {
    assert.equal(contrastingTextOnBackground("#fde047"), "#0f172a");
  });

  it("uses dark text on white background", () => {
    assert.equal(contrastingTextOnBackground("#ffffff"), "#0f172a");
  });

  it("falls back to white for unknown colors", () => {
    assert.equal(contrastingTextOnBackground("not-a-color"), "#ffffff");
  });
});
