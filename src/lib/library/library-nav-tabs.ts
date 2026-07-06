import type { LibraryNavModuleId } from "@/types/library-nav-modules";

export const LIBRARY_NAV_TABS = [
  { id: "draw" as const, label: "LIBRARY", href: "/library" },
  {
    id: "playbooks" as const,
    label: "PLAYBOOKS",
    href: "/library?tab=playbooks",
  },
  {
    id: "gameplan" as const,
    label: "GAME PLAN",
    shortLabel: "PLAN",
    href: "/library?tab=gameplan",
  },
  { id: "fields" as const, label: "FIELDS", href: "/library?tab=fields" },
  {
    id: "practice" as const,
    label: "PRACTICE",
    href: "/library?tab=practice",
  },
  {
    id: "coach" as const,
    label: "COACH",
    href: "/library?tab=coach",
  },
  { id: "players" as const, label: "PLAYERS", href: "/library?tab=players" },
  {
    id: "film-room" as const,
    label: "FILM ROOM",
    href: "/film-room",
  },
  {
    id: "scouting" as const,
    label: "SCOUTING",
    href: "/scouting",
  },
] as const;

export type LibraryNavTabId = (typeof LIBRARY_NAV_TABS)[number]["id"];

export type LibraryScreenTab = Exclude<LibraryNavTabId, "film-room" | "scouting">;

export const LIBRARY_NAV_MODULE_LABELS: Record<LibraryNavModuleId, string> = {
  draw: "Library",
  playbooks: "Playbooks",
  gameplan: "Game plan",
  fields: "Fields",
  practice: "Practice",
  coach: "Coach dashboard",
  players: "Players",
  "film-room": "Film room",
  scouting: "Scouting",
};
