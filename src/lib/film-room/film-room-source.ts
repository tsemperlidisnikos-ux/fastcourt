import { parseVideoUrl } from "@/lib/library/video-url";
import type { FilmRoomVideoSource } from "@/types/film-room";

function youtubeIdFromEmbed(embedUrl: string) {
  const match = embedUrl.match(/\/embed\/([^?&/]+)/);
  return match?.[1] ?? null;
}

export function filmRoomSourceFromUrl(raw: string): FilmRoomVideoSource | null {
  const parsed = parseVideoUrl(raw);
  if (!parsed) return null;

  if (parsed.provider === "youtube" && parsed.embedUrl) {
    const videoId = youtubeIdFromEmbed(parsed.embedUrl);
    if (!videoId) return null;
    return {
      kind: "youtube",
      videoId,
      originalUrl: parsed.originalUrl,
    };
  }

  if (parsed.provider === "direct" && parsed.embedUrl) {
    return {
      kind: "direct",
      url: parsed.embedUrl,
      label: parsed.providerLabel,
    };
  }

  return null;
}

export function filmRoomSourceLabel(source: FilmRoomVideoSource) {
  if (source.kind === "upload") return source.fileName;
  if (source.kind === "youtube") return "YouTube";
  return source.label ?? "Video URL";
}
