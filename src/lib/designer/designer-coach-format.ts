import {
  COACHING_CATEGORY_LABELS,
  COACHING_CATEGORY_ORDER,
} from "@/lib/film-room/film-coaching-format";
import { formatCounterForNotes } from "@/lib/film-room/film-counter-playbook";
import type { FilmClipCoachingRecommendations } from "@/lib/film-room/film-clip-analyze-types";

export function formatDesignerCoachingForNotes(
  coaching: FilmClipCoachingRecommendations,
  playTitle: string,
  frameLabel: string,
): string {
  const lines: string[] = [];
  lines.push(`Coach — ${playTitle} · ${frameLabel}`);

  for (const categoryId of COACHING_CATEGORY_ORDER) {
    const items = coaching[categoryId];
    if (!items.length) continue;
    lines.push("");
    lines.push(`${COACHING_CATEGORY_LABELS[categoryId]}:`);
    if (categoryId === "counters") {
      for (const item of coaching.counters) {
        lines.push(formatCounterForNotes(item));
      }
      continue;
    }
    for (const item of items) {
      lines.push(`• ${item.title} — ${item.detail}`);
    }
  }

  return lines.join("\n").trim();
}

export function appendDesignerCoachingToNotes(
  existing: string | undefined,
  block: string,
): string {
  const trimmed = block.trim();
  if (!trimmed) return existing ?? "";
  const prior = (existing ?? "").trim();
  if (!prior) return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
  return `${prior}<p><br></p><p><strong>Coach</strong></p><p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
