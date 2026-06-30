export type VideoProvider = "youtube" | "vimeo" | "hudl" | "direct" | "external";

export interface ParsedVideoUrl {
  provider: VideoProvider;
  originalUrl: string;
  openUrl: string;
  embedUrl?: string;
  providerLabel: string;
}

function normalizeInput(raw: string) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function hostKey(hostname: string) {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

function extractYouTubeId(url: URL) {
  const host = hostKey(url.hostname);
  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }
  if (
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com"
  ) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
      return parts[1] ?? null;
    }
  }
  return null;
}

function extractVimeoId(url: URL) {
  const host = hostKey(url.hostname);
  if (host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && parts[1]) return parts[1];
  }
  if (host === "vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "video" && parts[1] && /^\d+$/.test(parts[1])) return parts[1];
    if (parts[0] && /^\d+$/.test(parts[0])) return parts[0];
  }
  return null;
}

function isHudlHost(hostname: string) {
  const host = hostKey(hostname);
  return host === "hudl.com" || host.endsWith(".hudl.com");
}

function isDirectVideoPath(pathname: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(pathname);
}

export function isValidVideoUrl(raw: string) {
  if (!String(raw || "").trim()) return true;
  return parseVideoUrl(raw) !== null;
}

export function parseVideoUrl(raw: string): ParsedVideoUrl | null {
  const normalized = normalizeInput(raw);
  if (!normalized) return null;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const openUrl = url.href;
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: "youtube",
      originalUrl: raw.trim(),
      openUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`,
      providerLabel: "YouTube",
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: "vimeo",
      originalUrl: raw.trim(),
      openUrl,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      providerLabel: "Vimeo",
    };
  }

  if (isHudlHost(url.hostname)) {
    return {
      provider: "hudl",
      originalUrl: raw.trim(),
      openUrl,
      providerLabel: "Hudl",
    };
  }

  if (isDirectVideoPath(url.pathname)) {
    return {
      provider: "direct",
      originalUrl: raw.trim(),
      openUrl,
      embedUrl: openUrl,
      providerLabel: "Video file",
    };
  }

  return {
    provider: "external",
    originalUrl: raw.trim(),
    openUrl,
    providerLabel: "External link",
  };
}

export function canInlineEmbedVideo(raw?: string) {
  const parsed = parseVideoUrl(String(raw || ""));
  return !!parsed?.embedUrl;
}
