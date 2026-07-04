import type { LibraryScreenTab } from "@/lib/library/library-nav-tabs";
import {
  LIBRARY_NAV_MODULE_IDS,
  type LibraryNavModuleId,
  type LibraryNavModulesConfig,
} from "@/types/library-nav-modules";

const STORAGE_KEY = "fastcourt_library_nav_modules_v1";

export const LIBRARY_NAV_MODULES_STORAGE_KEY = STORAGE_KEY;
export const LIBRARY_NAV_MODULES_CHANGED_EVENT =
  "fastcourt:library-nav-modules-changed";

export const DEFAULT_LIBRARY_NAV_MODULES: LibraryNavModulesConfig = {
  draw: true,
  playbooks: true,
  gameplan: true,
  fields: true,
  practice: true,
  players: true,
  "film-room": true,
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function normalizeLibraryNavModules(
  raw: unknown,
): LibraryNavModulesConfig {
  const input =
    raw && typeof raw === "object"
      ? (raw as Partial<LibraryNavModulesConfig>)
      : {};
  const merged = { ...DEFAULT_LIBRARY_NAV_MODULES };
  for (const id of LIBRARY_NAV_MODULE_IDS) {
    if (typeof input[id] === "boolean") merged[id] = input[id]!;
  }
  if (!LIBRARY_NAV_MODULE_IDS.some((id) => merged[id])) {
    merged.draw = true;
  }
  return merged;
}

export function isLibraryNavModuleEnabled(
  config: LibraryNavModulesConfig,
  id: LibraryNavModuleId,
) {
  return config[id] !== false;
}

export function firstEnabledLibraryScreenTab(
  config: LibraryNavModulesConfig,
): LibraryScreenTab {
  const order: Exclude<LibraryNavModuleId, "film-room">[] = [
    "draw",
    "playbooks",
    "gameplan",
    "fields",
    "practice",
    "players",
  ];
  return order.find((id) => isLibraryNavModuleEnabled(config, id)) ?? "draw";
}

export function resolveLibraryScreenTab(
  raw: string | null,
  config: LibraryNavModulesConfig,
): LibraryScreenTab {
  const tab = parseLibraryScreenTab(raw);
  if (tab === "coach") {
    if (
      isLibraryNavModuleEnabled(config, "practice") ||
      isLibraryNavModuleEnabled(config, "film-room")
    ) {
      return tab;
    }
    return firstEnabledLibraryScreenTab(config);
  }
  if (isLibraryNavModuleEnabled(config, tab as LibraryNavModuleId)) return tab;
  return firstEnabledLibraryScreenTab(config);
}

export function parseLibraryScreenTab(raw: string | null): LibraryScreenTab {
  if (
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
  if (!isBrowser()) return { ...DEFAULT_LIBRARY_NAV_MODULES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LIBRARY_NAV_MODULES };
    return normalizeLibraryNavModules(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_LIBRARY_NAV_MODULES };
  }
}

export function saveLibraryNavModules(config: LibraryNavModulesConfig) {
  if (!isBrowser()) return;
  const normalized = normalizeLibraryNavModules(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(LIBRARY_NAV_MODULES_CHANGED_EVENT));
}
