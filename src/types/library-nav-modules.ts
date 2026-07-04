export const LIBRARY_NAV_MODULE_IDS = [
  "draw",
  "playbooks",
  "gameplan",
  "fields",
  "practice",
  "players",
  "film-room",
] as const;

export type LibraryNavModuleId = (typeof LIBRARY_NAV_MODULE_IDS)[number];

export type LibraryNavModulesConfig = Record<LibraryNavModuleId, boolean>;
