import {
  collectGamePlanFilmEvidence,
  type GamePlanFilmEvidenceItem,
} from "@/lib/film-room/film-game-plan-evidence";
import type { GamePlan } from "@/types/library-meta";

export interface DesignerCoachFilmEvidenceMatch extends GamePlanFilmEvidenceItem {
  matchReason: string;
  matchScore: number;
}

function normalizeToken(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function scoreFilmEvidenceItem(
  item: GamePlanFilmEvidenceItem,
  play: { id?: string; title: string; tags?: string[] },
  frameIndex: number,
  patterns: string[],
): { score: number; reason: string } | null {
  if (play.id && item.playId === play.id) {
    if (item.frameIndex != null && item.frameIndex === frameIndex) {
      return { score: 100, reason: "This frame on film" };
    }
    return { score: 90, reason: "This play on film" };
  }

  const hay = [
    item.title,
    item.detail ?? "",
    item.readLabel ?? "",
  ]
    .join(" ")
    .toLowerCase();
  const title = normalizeToken(play.title);
  if (title && hay.includes(title)) {
    return { score: 72, reason: "Title match on film" };
  }

  for (const tag of play.tags ?? []) {
    const token = normalizeToken(tag);
    if (token.length > 2 && hay.includes(token)) {
      return { score: 68, reason: `Tag "${tag}" on film` };
    }
  }

  for (const pattern of patterns) {
    const token = normalizeToken(pattern);
    if (token.length > 2 && hay.includes(token)) {
      return { score: 60, reason: `Pattern ${pattern} on film` };
    }
  }

  return { score: 35, reason: "Scout clip" };
}

/** Film clips linked on the active game plan, ranked for the current play/frame. */
export function filterCoachFilmEvidence(
  plan: GamePlan,
  play: { id?: string; title: string; tags?: string[] },
  frameIndex: number,
  patterns: string[],
  limit = 4,
): DesignerCoachFilmEvidenceMatch[] {
  const items = collectGamePlanFilmEvidence(plan);
  const ranked: DesignerCoachFilmEvidenceMatch[] = [];

  for (const item of items) {
    const match = scoreFilmEvidenceItem(item, play, frameIndex, patterns);
    if (!match) continue;
    ranked.push({
      ...item,
      matchScore: match.score,
      matchReason: match.reason,
    });
  }

  return ranked
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      const ta = left.timestamp ?? Number.POSITIVE_INFINITY;
      const tb = right.timestamp ?? Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

export function formatCoachFilmEvidenceNotes(
  item: DesignerCoachFilmEvidenceMatch,
  opponent: string,
): string {
  const time = item.timeLabel ? ` @ ${item.timeLabel}` : "";
  return `• Film vs ${opponent} — ${item.title}${time}: ${item.detail ?? item.matchReason}`;
}
