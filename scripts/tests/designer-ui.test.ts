import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("designer screen wiring", () => {
  const designerSrc = read("src/components/designer/DesignerScreen.tsx");

  it("exposes frame toolbar controls", () => {
    for (const id of [
      "btn-add-frame",
      "btn-clear-frame",
      "btn-delete-frame",
      "btn-undo",
      "btn-redo",
    ]) {
      assert.match(designerSrc, new RegExp(`id="${id}"`));
    }
  });

  it("uses appConfirm for clear frame", () => {
    assert.match(designerSrc, /appConfirm\(\{[\s\S]*title: "Clear frame"/);
  });

  it("notes editor has fixed height in CSS", () => {
    const css = read("src/styles/fastdraw-editor-ui.css");
    assert.match(css, /notes-editor-main[\s\S]*height:\s*200px/);
  });

  it("modal buttons use black text in designer base CSS", () => {
    const css = read("src/styles/fc-designer-base.css");
    assert.match(css, /\.modal-create[\s\S]*color:\s*#000/);
    assert.match(css, /\.modal-cancel[\s\S]*color:\s*#000/);
  });
});
