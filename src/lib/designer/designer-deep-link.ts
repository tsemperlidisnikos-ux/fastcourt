/** Build designer URLs with optional frame selection. */
export function parseDesignerFrameParam(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

export function buildDesignerHref(
  playId: string,
  frameIndex?: number | null,
): string {
  const params = new URLSearchParams({ item: playId });
  if (typeof frameIndex === "number" && frameIndex >= 0) {
    params.set("frame", String(frameIndex));
  }
  return `/designer?${params.toString()}`;
}

/** Find primary frame (first without read branch) and matching read frame. */
export function resolvePlayFrameLinks(
  frames: Array<{ id: string; readBranch?: { coverage?: string; parentFrameId?: string } }>,
  coverage?: string,
): { primaryFrameIndex: number; readFrameIndex?: number } {
  let primaryFrameIndex = frames.findIndex((frame) => !frame.readBranch?.parentFrameId);
  if (primaryFrameIndex < 0) primaryFrameIndex = 0;

  if (!coverage) {
    return { primaryFrameIndex };
  }

  const token = coverage.toLowerCase();
  const readFrameIndex = frames.findIndex(
    (frame) => frame.readBranch?.coverage?.toLowerCase() === token,
  );
  return {
    primaryFrameIndex,
    readFrameIndex: readFrameIndex >= 0 ? readFrameIndex : undefined,
  };
}
