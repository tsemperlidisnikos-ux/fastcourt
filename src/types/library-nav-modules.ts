export const LIBRARY_NAV_MODULE_IDS = [
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
] as const;

export type LibraryNavModuleId = (typeof LIBRARY_NAV_MODULE_IDS)[number];

export type LibraryNavModulesEnabled = Record<LibraryNavModuleId, boolean>;

export interface LibraryNavModulesConfig {
  enabled: LibraryNavModulesEnabled;
  order: LibraryNavModuleId[];
}
