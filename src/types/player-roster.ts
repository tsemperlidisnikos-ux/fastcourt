export interface PlayerRosterEntry {
  id: string;
  team: string;
  name: string;
  number?: string;
  email?: string;
  phone?: string;
}

export interface TeamRoster {
  players: PlayerRosterEntry[];
}

export interface PlayerRosterData {
  rosters: Record<string, TeamRoster>;
}

export type PlayerShareContentType = "play" | "drill" | "playbook" | "practice";

export interface PlayerShareSendContext {
  url: string;
  contentName: string;
  team: string;
  contentType: PlayerShareContentType;
}
