"use client";

import { createPortal } from "react-dom";
import { useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import { parseVideoUrl } from "@/lib/library/video-url";
import { VideoEmbed, VideoProviderBadge } from "@/components/library/VideoEmbed";
import "@/styles/fc-video-embed.css";

type Props = {
  videoUrl: string;
  title?: string;
  className?: string;
  id?: string;
  label?: string;
  titleAttr?: string;
  variant?: "button" | "link";
};

export function VideoWatchButton({
  videoUrl,
  title,
  className,
  id,
  label = "▶ Watch video",
  titleAttr = "Watch video",
  variant = "button",
}: Props) {
  const mounted = useClientMounted();
  const [open, setOpen] = useState(false);
  const parsed = parseVideoUrl(videoUrl);
  if (!parsed) return null;

  const opensInline = !!parsed.embedUrl;
  const watchLabel =
    parsed.provider === "hudl"
      ? "▶ Watch on Hudl"
      : opensInline
        ? label
        : `▶ Open ${parsed.providerLabel}`;

  function handleClick() {
    if (!parsed) return;
    if (opensInline) {
      setOpen(true);
      return;
    }
    window.open(parsed.openUrl, "_blank", "noopener,noreferrer");
  }

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        id={id}
        className={className}
        title={titleAttr}
        onClick={handleClick}
      >
        {watchLabel}
      </button>
    ) : (
      <button
        type="button"
        id={id}
        className={className}
        title={titleAttr}
        onClick={handleClick}
      >
        {watchLabel}
      </button>
    );

  return (
    <>
      {trigger}
      {open && mounted
        ? createPortal(
            <div
              className="fc-video-modal-overlay"
              role="dialog"
              aria-modal="true"
              aria-label={title ? `Video — ${title}` : "Play video"}
              onClick={() => setOpen(false)}
            >
              <div
                className="fc-video-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <header className="fc-video-modal-head">
                  <div className="fc-video-modal-title-wrap">
                    <h3 className="fc-video-modal-title">
                      {title || "Play video"}
                    </h3>
                    <VideoProviderBadge parsed={parsed} />
                  </div>
                  <button
                    type="button"
                    className="fc-video-modal-close"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </button>
                </header>
                <VideoEmbed videoUrl={videoUrl} title={title} />
                <footer className="fc-video-modal-foot">
                  <a
                    href={parsed.openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fc-video-modal-open-link"
                  >
                    Open on {parsed.providerLabel}
                  </a>
                </footer>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
