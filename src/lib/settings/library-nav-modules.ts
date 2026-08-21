import {
  LIBRARY_NAV_TABS,
  type LibraryNavTabId,
} from "@/lib/library/library-nav-tabs";
import type { LibraryScreenTab } from "@/lib/library/library-nav-tabs";
import {
  LIBRARY_NAV_MODULE_IDS,
  type LibraryNavModuleId,
  type LibraryNavModulesConfig,
  type LibraryNavModulesEnabled,
} from "@/types/library-nav-modules";

const STORAGE_KEY = "fastcourt_library_nav_modules_v2";

export const LIBRARY_NAV_MODULES_STORAGE_KEY = STORAGE_KEY;
export const LIBRARY_NAV_MODULES_CHANGED_EVENT =
  "fastcourt:library-nav-modules-changed";

/** Default header order (matches production nav). */
export const DEFAULT_LIBRARY_NAV_ORDER: LibraryNavModuleId[] = [
  "draw",
  "counters",
  "playbooks",
  "fields",
  "practice",
  "players",
  "film-room",
  "opponent-scout",
  "gameplan",
  "coach",
  "scouting",
];

/** Default visible tabs — Game Plan / Coach / Scouting stay off until enabled in Admin. */
export const DEFAULT_LIBRARY_NAV_ENABLED: LibraryNavModulesEnabled = {
  draw: true,
  counters: true,
  playbooks: true,
  gameplan: false,
  fields: true,
  practice: true,
  coach: false,
  players: true,
  "film-room": true,
  scouting: false,
  "opponent-scout": true,
};

export const DEFAULT_LIBRARY_NAV_MODULES: LibraryNavModulesConfig = {
  enabled: { ...DEFAULT_LIBRARY_NAV_ENABLED },
  order: [...DEFAULT_LIBRARY_NAV_ORDER],
};

function isBrowser() {
  return typeof window !== "undefined";
}

function isLegacyFlatConfig(
  raw: Record<string, unknown>,
): raw is Partial<LibraryNavModulesEnabled> {
  return !("enabled" in raw) && !("order" in raw);
}

function normalizeEnabled(
  input: Partial<LibraryNavModulesEnabled> | undefined,
): LibraryNavModulesEnabled {
  const enabled = { ...DEFAULT_LIBRARY_NAV_ENABLED };
  for (const id of LIBRARY_NAV_MODULE_IDS) {
    if (typeof input?.[id] === "boolean") enabled[id] = input[id]!;
  }
  if (!LIBRARY_NAV_MODULE_IDS.some((id) => enabled[id])) {
    enabled.draw = true;
  }
  return enabled;
}

function insertMissingModule(
  normalized: LibraryNavModuleId[],
  id: LibraryNavModuleId,
) {
  if (id === "counters") {
    const drawIndex = normalized.indexOf("draw");
    normalized.splice(drawIndex >= 0 ? drawIndex + 1 : 0, 0, id);
    return;
  }
  if (id === "coach") {
    const practiceIndex = normalized.indexOf("practice");
    normalized.splice(practiceIndex >= 0 ? practiceIndex + 1 : normalized.length, 0, id);
    return;
  }
  if (id === "scouting") {
    const filmIndex = normalized.indexOf("film-room");
    normalized.splice(filmIndex >= 0 ? filmIndex + 1 : normalized.length, 0, id);
    return;
  }
  if (id === "opponent-scout") {
    const scoutingIndex = normalized.indexOf("scouting");
    normalized.splice(
      scoutingIndex >= 0 ? scoutingIndex + 1 : normalized.length,
      0,
      id,
    );
    return;
  }
  normalized.push(id);
}

function normalizeOrder(
  order: unknown,
  enabled: LibraryNavModulesEnabled,
): LibraryNavModuleId[] {
  const seen = new Set<LibraryNavModuleId>();
  const normalized: LibraryNavModuleId[] = [];
  if (Array.isArray(order)) {
    for (const entry of order) {
      if (
        typeof entry === "string" &&
        (LIBRARY_NAV_MODULE_IDS as readonly string[]).includes(entry) &&
        !seen.has(entry as LibraryNavModuleId)
      ) {
        const id = entry as LibraryNavModuleId;
        seen.add(id);
        normalized.push(id);
      }
    }
  }
  for (const id of LIBRARY_NAV_MODULE_IDS) {
    if (!seen.has(id)) {
      insertMissingModule(normalized, id);
      seen.add(id);
    }
  }
  void enabled;
  return normalized;
}

export function normalizeLibraryNavModules(
  raw: unknown,
): LibraryNavModulesConfig {
  if (!raw || typeof raw !== "object") {
    return {
      enabled: { ...DEFAULT_LIBRARY_NAV_ENABLED },
      order: [...DEFAULT_LIBRARY_NAV_ORDER],
    };
  }
  const record = raw as Record<string, unknown>;
  if (isLegacyFlatConfig(record)) {
    return {
      enabled: normalizeEnabled(record as Partial<LibraryNavModulesEnabled>),
      order: [...DEFAULT_LIBRARY_NAV_ORDER],
    };
  }
  const enabled = normalizeEnabled(
    record.enabled as Partial<LibraryNavModulesEnabled> | undefined,
  );
  return {
    enabled,
    order: normalizeOrder(record.order, enabled),
  };
}

export function isLibraryNavModuleEnabled(
  config: LibraryNavModulesConfig,
  id: LibraryNavModuleId,
) {
  return config.enabled[id] !== false;
}

export function orderedLibraryNavTabs(config: LibraryNavModulesConfig) {
  const tabs: (typeof LIBRARY_NAV_TABS)[number][] = [];

  for (const id of config.order) {
    if (!isLibraryNavModuleEnabled(config, id)) continue;
    const tab = LIBRARY_NAV_TABS.find((row) => row.id === id);
    if (!tab) continue;
    tabs.push(tab);
  }

  return tabs;
}

export function reorderLibraryNavModules(
  config: LibraryNavModulesConfig,
  fromIndex: number,
  toIndex: number,
): LibraryNavModulesConfig {
  const order = [...config.order];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= order.length ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return config;
  }
  const [moved] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, moved!);
  return { ...config, order };
}

export function firstEnabledLibraryScreenTab(
  config: LibraryNavModulesConfig,
): LibraryScreenTab {
  for (const id of config.order) {
    if (!isLibraryNavModuleEnabled(config, id)) continue;
    if (id === "film-room" || id === "scouting" || id === "opponent-scout") {
      continue;
    }
    return id as LibraryScreenTab;
  }
  return "draw";
}

export function resolveLibraryScreenTab(
  raw: string | null,
  config: LibraryNavModulesConfig,
): LibraryScreenTab {
  const tab = parseLibraryScreenTab(raw);
  if (isLibraryNavModuleEnabled(config, tab as LibraryNavModuleId)) return tab;
  return firstEnabledLibraryScreenTab(config);
}

export function parseLibraryScreenTab(raw: string | null): LibraryScreenTab {
  if (
    raw === "counters" ||
    raw === "playbooks" ||
    raw === "gameplan" ||
    raw === "fields" ||
    raw === "practice" ||
    raw === "coach" ||
    raw === "players"
  ) {
    return raw;
  }
  return "draw";
}

export function libraryScreenTabHref(tab: LibraryScreenTab) {
  if (tab === "draw") return "/library";
  return `/library?tab=${tab}`;
}

export function loadLibraryNavModules(): LibraryNavModulesConfig {
  if (!isBrowser()) return normalizeLibraryNavModules(undefined);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeLibraryNavModules(undefined);
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeLibraryNavModules(parsed);
    // Persist newly introduced modules (e.g. counters) into saved config so
    // they appear in the header even after older Admin Apply snapshots.
    if (shouldRewriteNavModules(parsed, normalized)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return normalizeLibraryNavModules(undefined);
  }
}

function shouldRewriteNavModules(
  raw: unknown,
  normalized: LibraryNavModulesConfig,
): boolean {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Record<string, unknown>;
  if (isLegacyFlatConfig(record)) return true;
  const order = Array.isArray(record.order) ? record.order : [];
  if (!order.includes("counters")) return true;
  const enabled = record.enabled;
  if (!enabled || typeof enabled !== "object") return true;
  if (!("counters" in (enabled as object))) return true;
  void normalized;
  return false;
}

export function saveLibraryNavModules(config: LibraryNavModulesConfig) {
  if (!isBrowser()) return;
  const normalized = normalizeLibraryNavModules(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(LIBRARY_NAV_MODULES_CHANGED_EVENT));
}

export type { LibraryNavTabId };
