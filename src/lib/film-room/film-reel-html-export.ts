import type { PossessionReelManifest } from "@/lib/film-room/possession-reel-export";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildStandaloneReelHtml(manifest: PossessionReelManifest): string {
  const rows = manifest.segments
    .map(
      (segment) => `
        <li class="reel-row">
          <span class="reel-num">${segment.index}</span>
          <div class="reel-main">
            <strong>${escapeHtml(segment.timeLabel)} · ${escapeHtml(segment.label)}</strong>
            <p class="reel-range">${segment.startSec.toFixed(1)}s → ${segment.endSec.toFixed(1)}s (${Math.round(segment.durationSec)}s)</p>
            ${segment.note ? `<p class="reel-note">${escapeHtml(segment.note)}</p>` : ""}
            <a href="${escapeHtml(segment.deepLink)}" target="_blank" rel="noopener">Open in FastCourt ↗</a>
          </div>
        </li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(manifest.sessionTitle)} — Possession reel</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 40px; }
    h1 { margin: 0 0 8px; font-size: 1.5rem; }
    .meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 20px; }
    ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .reel-row { display: flex; gap: 12px; padding: 12px; border-radius: 10px; background: #1e293b; border: 1px solid #334155; }
    .reel-num { font-weight: 800; color: #93c5fd; min-width: 1.5rem; }
    .reel-main strong { display: block; margin-bottom: 4px; }
    .reel-range, .reel-note { margin: 0 0 6px; font-size: 0.85rem; color: #cbd5e1; }
    a { color: #60a5fa; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(manifest.sessionTitle)}</h1>
    <p class="meta">${manifest.segmentCount} possessions · ${escapeHtml(manifest.sourceKind)} · ${escapeHtml(manifest.generatedAt)}</p>
    <ol>${rows}</ol>
  </div>
</body>
</html>`;
}
