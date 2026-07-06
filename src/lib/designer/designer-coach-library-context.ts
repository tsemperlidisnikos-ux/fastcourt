import { rankCoachAlternativePlays } from "@/lib/designer/designer-coach-alternatives";
import type {
  DesignerCoachAlternative,
  DesignerCoachPlayContext,
} from "@/lib/designer/analyze-play-locally";
import type { StoredPlay } from "@/types/library";

export interface DesignerCoachLibraryPlaySummary {
  playId: string;
  title: string;
  series?: string;
  tags?: string[];
  scorePct: number;
  reasons: string[];
}

export function buildDesignerCoachLibraryContext(
  play: DesignerCoachPlayContext,
  library: StoredPlay[],
  limit = 5,
): DesignerCoachLibraryPlaySummary[] {
  return rankCoachAlternativePlays({
    play,
    library,
    limit,
  }).map((row) => ({
    playId: row.play.id,
    title: row.play.title,
    series: row.play.series,
    tags: row.play.tags,
    scorePct: row.scorePct,
    reasons: row.reasons,
  }));
}

export function buildDesignerCoachLibraryPromptSection(
  rows: DesignerCoachLibraryPlaySummary[],
): string {
  if (!rows.length) return "";
  const lines = rows.map((row) => {
    const tags = (row.tags ?? []).slice(0, 4).join(", ");
    const series = row.series?.trim() ? ` · series: ${row.series}` : "";
    const reasons = row.reasons.length ? ` (${row.reasons.join("; ")})` : "";
    return `- [${row.playId}] ${row.title}${series}${tags ? ` · tags: ${tags}` : ""} — ${row.scorePct}% fit${reasons}`;
  });
  return `Library plays you may reference by playId in alternativeOptions:
${lines.join("\n")}`;
}

export function mergeAiGroundedAlternatives(
  local: DesignerCoachAlternative[],
  aiRows: Array<{
    playId: string;
    title: string;
    detail: string;
    priority?: "high" | "medium" | "low";
  }>,
  library: StoredPlay[],
) {
  const merged = [...local];
  for (const row of aiRows) {
    if (merged.some((alt) => alt.kind === "library" && alt.playId === row.playId)) {
      continue;
    }
    const play = library.find((item) => item.id === row.playId);
    if (!play) continue;
    merged.push({
      kind: "library",
      title: row.title || play.title,
      detail: `${row.detail} — AI pick from library.`,
      priority: row.priority ?? "medium",
      playId: play.id,
      playTitle: play.title,
      scorePct: 75,
    });
  }
  return merged.slice(0, 7);
}
