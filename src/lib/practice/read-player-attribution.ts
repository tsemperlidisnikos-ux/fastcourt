import {
  isReadTrackableItem,
  readItemLabel,
} from "@/lib/practice/read-success-scorecard";
import type { PracticeSession } from "@/types/library-meta";
import type { PlayerRosterEntry } from "@/types/player-roster";

export interface ReadPlayerStat {
  playerId: string;
  playerName: string;
  playerNumber?: string;
  landed: number;
  missed: number;
  unmarked: number;
  successRatePct: number | null;
  topCalls: string[];
}

export interface ReadPlayerAttribution {
  players: ReadPlayerStat[];
  unattributedLanded: number;
  unattributedMissed: number;
}

function playerDisplayName(
  playerId: string,
  rosterById: Map<string, PlayerRosterEntry>,
): string {
  const player = rosterById.get(playerId);
  if (!player) return "Unknown player";
  const num = player.number?.trim();
  return num ? `#${num} ${player.name}` : player.name;
}

export function buildReadPlayerAttribution(
  sessions: PracticeSession[],
  rosterPlayers: PlayerRosterEntry[],
  options: { teamFilter?: string; maxPlayers?: number } = {},
): ReadPlayerAttribution {
  const team = options.teamFilter?.trim();
  const scoped = team
    ? sessions.filter((session) => session.team === team)
    : sessions;

  const rosterById = new Map(rosterPlayers.map((player) => [player.id, player]));
  const stats = new Map<
    string,
    {
      landed: number;
      missed: number;
      unmarked: number;
      calls: Map<string, number>;
    }
  >();
  let unattributedLanded = 0;
  let unattributedMissed = 0;

  for (const session of scoped) {
    for (const item of session.items) {
      if (!isReadTrackableItem(item)) continue;
      if (!item.readPlayerId) {
        if (item.readOutcome === "landed") unattributedLanded += 1;
        else if (item.readOutcome === "missed") unattributedMissed += 1;
        continue;
      }
      const bucket = stats.get(item.readPlayerId) ?? {
        landed: 0,
        missed: 0,
        unmarked: 0,
        calls: new Map<string, number>(),
      };
      if (item.readOutcome === "landed") bucket.landed += 1;
      else if (item.readOutcome === "missed") bucket.missed += 1;
      else bucket.unmarked += 1;

      const call = readItemLabel(item);
      bucket.calls.set(call, (bucket.calls.get(call) ?? 0) + 1);
      stats.set(item.readPlayerId, bucket);
    }
  }

  const maxPlayers = options.maxPlayers ?? 12;
  const players: ReadPlayerStat[] = [...stats.entries()]
    .map(([playerId, row]) => {
      const marked = row.landed + row.missed;
      const topCalls = [...row.calls.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([call]) => call);
      const rosterPlayer = rosterById.get(playerId);
      return {
        playerId,
        playerName: playerDisplayName(playerId, rosterById),
        playerNumber: rosterPlayer?.number,
        landed: row.landed,
        missed: row.missed,
        unmarked: row.unmarked,
        successRatePct:
          marked > 0 ? Math.round((row.landed / marked) * 100) : null,
        topCalls,
      };
    })
    .sort((a, b) => b.landed + b.missed - (a.landed + a.missed))
    .slice(0, maxPlayers);

  return { players, unattributedLanded, unattributedMissed };
}
