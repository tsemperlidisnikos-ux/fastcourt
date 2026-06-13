import { getRosterTeamOptions } from "@/lib/players/team-options";
import { useAuthStore } from "@/stores/auth-store";
import type { PlayerRosterData, PlayerRosterEntry, TeamRoster } from "@/types/player-roster";

const STORAGE_KEY = "fastcourt_playerRoster_v1";

function rosterStorageKey() {
  const email = useAuthStore.getState().session?.user?.email?.trim().toLowerCase();
  return email ? `${STORAGE_KEY}:${email}` : STORAGE_KEY;
}

function normalizeTeamKey(team: string) {
  const trimmed = String(team || "").trim();
  return trimmed || "No Team";
}

function newPlayerId() {
  return `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyData(): PlayerRosterData {
  return { rosters: {} };
}

function loadPlayerRosterData(): PlayerRosterData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(rosterStorageKey());
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw) as PlayerRosterData;
    if (!parsed.rosters || typeof parsed.rosters !== "object") return emptyData();
    return parsed;
  } catch {
    return emptyData();
  }
}

function savePlayerRosterData(data: PlayerRosterData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(rosterStorageKey(), JSON.stringify(data));
}

function hydrateRosterPlayers(team: string, roster: TeamRoster): PlayerRosterEntry[] {
  const key = normalizeTeamKey(team);
  return roster.players.map((player) => ({
    ...player,
    team: String(player.team || key).trim() || key,
  }));
}

export function getTeamRoster(team: string): TeamRoster {
  const data = loadPlayerRosterData();
  const key = normalizeTeamKey(team);
  if (!data.rosters[key]) data.rosters[key] = { players: [] };
  if (!Array.isArray(data.rosters[key].players)) data.rosters[key].players = [];
  return { players: hydrateRosterPlayers(key, data.rosters[key]) };
}

function setTeamRoster(team: string, roster: TeamRoster) {
  const data = loadPlayerRosterData();
  data.rosters[normalizeTeamKey(team)] = {
    players: Array.isArray(roster.players) ? roster.players : [],
  };
  savePlayerRosterData(data);
}

export function addRosterPlayer(
  team: string,
  input: Pick<PlayerRosterEntry, "name" | "number" | "email" | "phone">,
  configuredTeams: string[] = [],
): PlayerRosterEntry | null {
  const name = String(input.name || "").trim();
  if (!name) return null;

  const teamKey = normalizeTeamKey(team);
  const allowedTeams = getRosterTeamOptions(configuredTeams);
  if (!allowedTeams.includes(teamKey)) {
    return null;
  }
  if (teamKey === "No Team" && allowedTeams.some((t) => t !== "No Team")) {
    return null;
  }

  const roster = getTeamRoster(teamKey);
  const player: PlayerRosterEntry = {
    id: newPlayerId(),
    team: teamKey,
    name,
    number: String(input.number || "").trim() || undefined,
    email: String(input.email || "").trim() || undefined,
    phone: String(input.phone || "").trim() || undefined,
  };
  roster.players.push(player);
  setTeamRoster(teamKey, roster);
  return player;
}

export function removeRosterPlayer(team: string, playerId: string) {
  const roster = getTeamRoster(team);
  roster.players = roster.players.filter((p) => p.id !== playerId);
  setTeamRoster(team, roster);
}

export function updateRosterPlayer(
  originalTeam: string,
  playerId: string,
  input: Pick<PlayerRosterEntry, "name" | "number" | "email" | "phone" | "team">,
  configuredTeams: string[] = [],
): PlayerRosterEntry | null {
  const name = String(input.name || "").trim();
  if (!name) return null;

  const newTeamKey = normalizeTeamKey(input.team || originalTeam);
  const allowedTeams = getRosterTeamOptions(configuredTeams);
  if (!allowedTeams.includes(newTeamKey)) return null;
  if (newTeamKey === "No Team" && allowedTeams.some((t) => t !== "No Team")) {
    return null;
  }

  const oldTeamKey = normalizeTeamKey(originalTeam);
  const oldRoster = getTeamRoster(oldTeamKey);
  const index = oldRoster.players.findIndex((p) => p.id === playerId);
  if (index === -1) return null;

  const existing = oldRoster.players[index];
  const updated: PlayerRosterEntry = {
    ...existing,
    team: newTeamKey,
    name,
    number: String(input.number || "").trim() || undefined,
    email: String(input.email || "").trim() || undefined,
    phone: String(input.phone || "").trim() || undefined,
  };

  if (oldTeamKey === newTeamKey) {
    oldRoster.players[index] = updated;
    setTeamRoster(oldTeamKey, oldRoster);
  } else {
    oldRoster.players.splice(index, 1);
    setTeamRoster(oldTeamKey, oldRoster);
    const newRoster = getTeamRoster(newTeamKey);
    newRoster.players.push(updated);
    setTeamRoster(newTeamKey, newRoster);
  }

  return updated;
}

export function getAllRosterPlayers(): PlayerRosterEntry[] {
  const data = loadPlayerRosterData();
  const all: PlayerRosterEntry[] = [];
  for (const [key, roster] of Object.entries(data.rosters)) {
    if (!Array.isArray(roster?.players) || !roster.players.length) continue;
    all.push(...hydrateRosterPlayers(key, roster));
  }
  return all;
}

export function playerRosterDisplayName(player: Pick<PlayerRosterEntry, "name" | "number">) {
  const name = String(player.name || "").trim();
  const number = String(player.number || "").trim();
  if (name && number) return `#${number} ${name}`;
  return name || "Player";
}

export function playerRosterContactMeta(player: Pick<PlayerRosterEntry, "email" | "phone">) {
  const parts = [player.email, player.phone].map((v) => String(v || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" · ") : "No email or phone";
}

export function normalizeWhatsAppPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}
