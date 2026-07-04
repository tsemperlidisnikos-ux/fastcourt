"use client";

import { formatFilmEventTime } from "@/lib/film-room/film-event-tags";
import type { FilmFramePreview } from "@/lib/film-room/capture-film-frames";

interface Props {
  previews: FilmFramePreview[];
  open: boolean;
}

export function FilmRoomFramePreviewStrip({ previews, open }: Props) {
  if (!open || !previews.length) return null;

  return (
    <div className="fc-film-frame-preview-strip" aria-label="Captured frames preview">
      <span className="fc-film-frame-preview-label">
        {previews.length} frames captured
      </span>
      <div className="fc-film-frame-preview-row">
        {previews.map((preview, index) => (
          <figure key={`${preview.time}-${index}`} className="fc-film-frame-preview-item">
            <img src={preview.dataUrl} alt={`Frame at ${formatFilmEventTime(preview.time)}`} />
            <figcaption>{formatFilmEventTime(preview.time)}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
