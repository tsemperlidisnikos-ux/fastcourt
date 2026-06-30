import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolvePdfCoverSubtitle,
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "../../src/lib/settings/pdf-brand-export.ts";
import { DEFAULT_PDF_BRAND } from "../../src/lib/settings/pdf-branding.ts";

describe("pdf brand export", () => {
  const brand = {
    ...DEFAULT_PDF_BRAND,
    clubName: "Athens BC U18",
    subtitle: "2025–26 Season",
    footerText: "Athens BC — Confidential",
  };

  it("prefers document team over pdf club name", () => {
    assert.equal(resolvePdfCoverTeam(brand, "Varsity"), "Varsity");
  });

  it("falls back to pdf club name when team is empty or No Team", () => {
    assert.equal(resolvePdfCoverTeam(brand, ""), "Athens BC U18");
    assert.equal(resolvePdfCoverTeam(brand, "No Team"), "Athens BC U18");
  });

  it("prefers cover/playbook subtitle over pdf tagline", () => {
    assert.equal(
      resolvePdfCoverSubtitle(brand, "Playbook subtitle", "Play subtitle"),
      "Playbook subtitle",
    );
    assert.equal(resolvePdfCoverSubtitle(brand, "", "Play subtitle"), "Play subtitle");
    assert.equal(resolvePdfCoverSubtitle(brand, "", ""), "2025–26 Season");
  });

  it("returns trimmed pdf footer line", () => {
    assert.equal(resolvePdfFooterText(brand), "Athens BC — Confidential");
    assert.equal(resolvePdfFooterText({ footerText: "  " }), "");
  });
});
