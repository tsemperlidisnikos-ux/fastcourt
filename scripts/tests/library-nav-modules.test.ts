import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LIBRARY_NAV_MODULES,
  firstEnabledLibraryScreenTab,
  normalizeLibraryNavModules,
  resolveLibraryScreenTab,
} from "../../src/lib/settings/library-nav-modules.ts";

describe("library nav modules", () => {
  it("defaults all sections visible", () => {
    assert.deepEqual(normalizeLibraryNavModules(undefined), DEFAULT_LIBRARY_NAV_MODULES);
  });

  it("keeps at least one section enabled", () => {
    const allOff = Object.fromEntries(
      Object.keys(DEFAULT_LIBRARY_NAV_MODULES).map((k) => [k, false]),
    );
    const normalized = normalizeLibraryNavModules(allOff);
    assert.equal(normalized.draw, true);
  });

  it("redirects disabled tabs to first enabled", () => {
    const config = normalizeLibraryNavModules({
      ...DEFAULT_LIBRARY_NAV_MODULES,
      playbooks: false,
      gameplan: false,
      fields: false,
      practice: false,
      players: false,
      "film-room": false,
    });
    assert.equal(resolveLibraryScreenTab("playbooks", config), "draw");
    assert.equal(firstEnabledLibraryScreenTab(config), "draw");
  });

  it("honors enabled non-draw tab", () => {
    const config = normalizeLibraryNavModules({
      ...DEFAULT_LIBRARY_NAV_MODULES,
      draw: false,
      playbooks: true,
    });
    assert.equal(resolveLibraryScreenTab(null, config), "playbooks");
    assert.equal(firstEnabledLibraryScreenTab(config), "playbooks");
  });
});
