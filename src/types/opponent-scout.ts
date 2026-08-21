export interface OpponentScoutStats {
  gpGs: string;
  pts: string;
  min: string;
  fgmA: string;
  fgPct: string;
  threePmA: string;
  threePct: string;
  ftmA: string;
  ftPct: string;
  reb: string;
  ast: string;
  to: string;
  stl: string;
  blk: string;
}

export interface OpponentScoutPlayer {
  id: string;
  jersey: string;
  name: string;
  position: string;
  height: string;
  photoDataUrl: string;
  stats: OpponentScoutStats;
  strengths: string[];
  weaknesses: string[];
}

export interface OpponentScoutReport {
  id: string;
  teamName: string;
  gameDate: string;
  teamLogoDataUrl: string;
  players: OpponentScoutPlayer[];
  createdAt: string;
  updatedAt: string;
}

export const EMPTY_OPPONENT_SCOUT_STATS: OpponentScoutStats = {
  gpGs: "",
  pts: "",
  min: "",
  fgmA: "",
  fgPct: "",
  threePmA: "",
  threePct: "",
  ftmA: "",
  ftPct: "",
  reb: "",
  ast: "",
  to: "",
  stl: "",
  blk: "",
};

export const OPPONENT_SCOUT_STAT_COLUMNS: {
  key: keyof OpponentScoutStats;
  label: string;
}[] = [
  { key: "gpGs", label: "GP-GS" },
  { key: "pts", label: "PTS" },
  { key: "min", label: "MIN" },
  { key: "fgmA", label: "FGM-A" },
  { key: "fgPct", label: "FG%" },
  { key: "threePmA", label: "3PM-A" },
  { key: "threePct", label: "3P%" },
  { key: "ftmA", label: "FTM-A" },
  { key: "ftPct", label: "FT%" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "to", label: "TO" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
];
