import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_PLATFORM_FEATURES,
  isDesignerCoachEnabled,
  isSimilarPlaysEnabled,
  normalizePlatformFeatures,
} from "../../src/lib/settings/platform-features.ts";

describe("platform features", () => {
  it("defaults similar plays and designer coach on", () => {
    assert.deepEqual(
      normalizePlatformFeatures(undefined),
      DEFAULT_PLATFORM_FEATURES,
    );
    assert.equal(DEFAULT_PLATFORM_FEATURES.similarPlays, true);
    assert.equal(DEFAULT_PLATFORM_FEATURES.designerCoach, true);
  });

  it("honors similarPlays false", () => {
    const config = normalizePlatformFeatures({ similarPlays: false });
    assert.equal(config.similarPlays, false);
    assert.equal(isSimilarPlaysEnabled(config), false);
    assert.equal(config.designerCoach, true);
  });

  it("honors designerCoach false", () => {
    const config = normalizePlatformFeatures({ designerCoach: false });
    assert.equal(config.designerCoach, false);
    assert.equal(isDesignerCoachEnabled(config), false);
    assert.equal(config.similarPlays, true);
  });

  it("ignores invalid values", () => {
    const config = normalizePlatformFeatures({
      similarPlays: "no",
      designerCoach: 0,
    });
    assert.equal(config.similarPlays, true);
    assert.equal(config.designerCoach, true);
    assert.equal(isSimilarPlaysEnabled(config), true);
    assert.equal(isDesignerCoachEnabled(config), true);
  });

  it("migrates older stored config missing designerCoach", () => {
    const config = normalizePlatformFeatures({ similarPlays: false });
    assert.equal(config.similarPlays, false);
    assert.equal(config.designerCoach, true);
  });
});
