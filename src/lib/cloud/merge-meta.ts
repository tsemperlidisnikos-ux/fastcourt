import type { CloudOrganizerMeta } from "@/lib/cloud/library-meta-types";
import { EMPTY_ORGANIZER_META } from "@/lib/cloud/library-meta-types";
import type {
  GamePlan,
  PlaybookSection,
  PracticeSession,
  PlayerHomeworkAssignment,
} from "@/types/library-meta";

function mergeStringLists(local: string[], remote: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...local, ...remote]) {
    const trimmed = String(value || "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function mergeRecordsByUpdatedAt<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of remote) {
    if (item?.id) byId.set(item.id, item);
  }
  for (const item of local) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      byId.set(item.id, item);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function normalizeMeta(meta: Partial<CloudOrganizerMeta> | null | undefined): CloudOrganizerMeta {
  const seasons = Array.isArray(meta?.seasons) ? meta!.seasons : EMPTY_ORGANIZER_META.seasons;
  const teams = Array.isArray(meta?.teams) ? meta!.teams : EMPTY_ORGANIZER_META.teams;
  return {
    seasons: seasons.length ? seasons : ["Default"],
    teams: teams.length ? teams : ["No Team"],
    series: Array.isArray(meta?.series) ? meta!.series : [],
    fieldTags: Array.isArray(meta?.fieldTags) ? meta!.fieldTags : [],
    playbooks: Array.isArray(meta?.playbooks) ? meta!.playbooks : [],
    practice: {
      sessions: Array.isArray(meta?.practice?.sessions) ? meta!.practice!.sessions : [],
    },
    gamePlans: Array.isArray(meta?.gamePlans) ? meta!.gamePlans : [],
    playerHomework: Array.isArray(meta?.playerHomework) ? meta!.playerHomework : [],
  };
}

export function mergeOrganizerMeta(
  local: CloudOrganizerMeta,
  remote: CloudOrganizerMeta,
): CloudOrganizerMeta {
  const l = normalizeMeta(local);
  const r = normalizeMeta(remote);
  return {
    seasons: mergeStringLists(l.seasons, r.seasons),
    teams: mergeStringLists(l.teams, r.teams),
    series: mergeStringLists(l.series, r.series),
    fieldTags: mergeStringLists(l.fieldTags, r.fieldTags),
    playbooks: mergeRecordsByUpdatedAt<PlaybookSection>(l.playbooks, r.playbooks),
    practice: {
      sessions: mergeRecordsByUpdatedAt<PracticeSession>(
        l.practice.sessions,
        r.practice.sessions,
      ),
    },
    gamePlans: mergeRecordsByUpdatedAt<GamePlan>(l.gamePlans, r.gamePlans),
    playerHomework: mergeRecordsByUpdatedAt<PlayerHomeworkAssignment>(
      l.playerHomework,
      r.playerHomework,
    ),
  };
}
