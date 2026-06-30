"use client";

import type { ParsedVideoUrl } from "@/lib/library/video-url";
import { parseVideoUrl } from "@/lib/library/video-url";
import "@/styles/fc-video-embed.css";

type Props = {
  videoUrl: string;
  title?: string;
  compact?: boolean;
  className?: string;
};

export function VideoEmbed({ videoUrl, title, compact, className }: Props) {
  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) return null;

  const rootClass = [
    "fc-video-embed",
    compact ? "fc-video-embed-compact" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (parsed.provider === "youtube" || parsed.provider === "vimeo") {
    return (
      <div className={rootClass}>
        <iframe
          className="fc-video-embed-frame"
          src={parsed.embedUrl}
          title={title ? `${title} — ${parsed.providerLabel}` : `${parsed.providerLabel} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (parsed.provider === "direct" && parsed.embedUrl) {
    return (
      <div className={rootClass}>
        <video
          className="fc-video-embed-native"
          src={parsed.embedUrl}
          controls
          playsInline
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className={`${rootClass} fc-video-embed-external`}>
      <p className="fc-video-embed-external-copy">
        This video opens on {parsed.providerLabel}.
      </p>
      <a
        className="fc-video-embed-external-link"
        href={parsed.openUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open {parsed.providerLabel} video
      </a>
    </div>
  );
}

export function VideoProviderBadge({ parsed }: { parsed: ParsedVideoUrl }) {
  return <span className="fc-video-provider-badge">{parsed.providerLabel}</span>;
}
