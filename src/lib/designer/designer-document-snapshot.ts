import type { StoredPlay } from "@/types/library";

/** Stable JSON for comparing designer document state (ignores timestamps). */
export function serializeDesignerDocument(play: StoredPlay): string {
  return JSON.stringify({
    id: play.id,
    title: play.title,
    courtType: play.courtType,
    courtView: play.courtView,
    frames: play.frames,
    animSpeed: play.animSpeed,
    animPauseMs: play.animPauseMs,
    type: play.type,
    season: play.season,
    team: play.team,
    series: play.series,
    tags: play.tags,
    playNotes: play.playNotes ?? "",
    videoUrl: play.videoUrl ?? "",
  });
}

export function designerDocumentsEqual(a: StoredPlay, b: StoredPlay): boolean {
  return serializeDesignerDocument(a) === serializeDesignerDocument(b);
}
