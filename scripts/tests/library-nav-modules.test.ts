import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_LIBRARY_NAV_MODULES,
  firstEnabledLibraryScreenTab,
  normalizeLibraryNavModules,
  orderedLibraryNavTabs,
  reorderLibraryNavModules,
  resolveLibraryScreenTab,
} from "../../src/lib/settings/library-nav-modules.ts";

describe("library nav modules", () => {
  it("defaults to production-visible sections only", () => {
    assert.deepEqual(normalizeLibraryNavModules(undefined), DEFAULT_LIBRARY_NAV_MODULES);
    const tabs = orderedLibraryNavTabs(DEFAULT_LIBRARY_NAV_MODULES);
    assert.deepEqual(
      tabs.map((tab) => tab.id),
      [
        "draw",
        "counters",
        "playbooks",
        "fields",
        "practice",
        "players",
        "film-room",
        "opponent-scout",
      ],
    );
  });

  it("migrates legacy flat boolean config", () => {
    const legacy = {
      draw: true,
      playbooks: false,
      gameplan: true,
      fields: true,
      practice: true,
      players: true,
      "film-room": false,
    };
    const normalized = normalizeLibraryNavModules(legacy);
    assert.equal(normalized.enabled.playbooks, false);
    assert.equal(normalized.enabled["film-room"], false);
    assert.deepEqual(normalized.order, DEFAULT_LIBRARY_NAV_MODULES.order);
  });

  it("keeps at least one section enabled", () => {
    const allOff = Object.fromEntries(
      DEFAULT_LIBRARY_NAV_MODULES.order.map((k) => [k, false]),
    );
    const normalized = normalizeLibraryNavModules(allOff);
    assert.equal(normalized.enabled.draw, true);
  });

  it("redirects disabled tabs to first enabled", () => {
    const config = normalizeLibraryNavModules({
      enabled: {
        ...DEFAULT_LIBRARY_NAV_MODULES.enabled,
        playbooks: false,
        gameplan: false,
        fields: false,
        practice: false,
        players: false,
        "film-room": false,
      },
      order: DEFAULT_LIBRARY_NAV_MODULES.order,
    });
    assert.equal(resolveLibraryScreenTab("playbooks", config), "draw");
    assert.equal(firstEnabledLibraryScreenTab(config), "draw");
  });

  it("honors enabled non-draw tab", () => {
    const config = normalizeLibraryNavModules({
      enabled: {
        ...DEFAULT_LIBRARY_NAV_MODULES.enabled,
        draw: false,
        counters: false,
        playbooks: true,
      },
      order: DEFAULT_LIBRARY_NAV_MODULES.order,
    });
    assert.equal(resolveLibraryScreenTab(null, config), "playbooks");
    assert.equal(firstEnabledLibraryScreenTab(config), "playbooks");
  });

  it("orders visible header tabs from config.order", () => {
    const config = normalizeLibraryNavModules({
      enabled: {
        ...DEFAULT_LIBRARY_NAV_MODULES.enabled,
        coach: true,
        scouting: true,
        gameplan: true,
      },
      order: [
        "film-room",
        "coach",
        "practice",
        "draw",
        "playbooks",
        "gameplan",
        "fields",
        "players",
      ],
    });
    const tabs = orderedLibraryNavTabs(config);
    assert.deepEqual(
      tabs.map((tab) => tab.id),
      [
        "film-room",
        "scouting",
        "opponent-scout",
        "coach",
        "practice",
        "draw",
        "counters",
        "playbooks",
        "gameplan",
        "fields",
        "players",
      ],
    );
  });

  it("inserts coach into legacy order after practice", () => {
    const config = normalizeLibraryNavModules({
      enabled: DEFAULT_LIBRARY_NAV_MODULES.enabled,
      order: ["draw", "playbooks", "gameplan", "fields", "practice", "players", "film-room"],
    });
    assert.deepEqual(
      config.order,
      [
        "draw",
        "counters",
        "playbooks",
        "gameplan",
        "fields",
        "practice",
        "coach",
        "players",
        "film-room",
        "scouting",
        "opponent-scout",
      ],
    );
  });

  it("keeps opponent scout visible after film room by default", () => {
    const tabs = orderedLibraryNavTabs(DEFAULT_LIBRARY_NAV_MODULES);
    const filmIndex = tabs.findIndex((tab) => tab.id === "film-room");
    const opponentIndex = tabs.findIndex((tab) => tab.id === "opponent-scout");
    assert.ok(filmIndex >= 0);
    assert.ok(opponentIndex === filmIndex + 1);
    assert.equal(
      tabs.find((tab) => tab.id === "opponent-scout")?.label,
      "OPPONENT SCOUT",
    );
    assert.equal(
      tabs.find((tab) => tab.id === "scouting"),
      undefined,
    );
  });

  it("reorders module ids", () => {
    const next = reorderLibraryNavModules(DEFAULT_LIBRARY_NAV_MODULES, 0, 2);
    // draw, counters, playbooks → counters, playbooks, draw
    assert.equal(next.order[0], "counters");
    assert.equal(next.order[1], "playbooks");
    assert.equal(next.order[2], "draw");
  });
});
