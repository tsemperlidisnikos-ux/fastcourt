export const MARKUP_TOOLBAR_FLOAT_PADDING_PX = 12;
/** Default gap above the playback control dock. */
export const MARKUP_TOOLBAR_CONTROLS_GAP_PX = 68;

export function defaultMarkupToolbarPosition(
  boundsWidth: number,
  boundsHeight: number,
  toolbarWidth: number,
  toolbarHeight: number,
) {
  const x = Math.max(
    MARKUP_TOOLBAR_FLOAT_PADDING_PX,
    (boundsWidth - toolbarWidth) / 2,
  );
  const y = Math.max(
    MARKUP_TOOLBAR_FLOAT_PADDING_PX,
    boundsHeight - toolbarHeight - MARKUP_TOOLBAR_CONTROLS_GAP_PX,
  );
  return clampMarkupToolbarPosition(
    x,
    y,
    boundsWidth,
    boundsHeight,
    toolbarWidth,
    toolbarHeight,
  );
}

export function clampMarkupToolbarPosition(
  x: number,
  y: number,
  boundsWidth: number,
  boundsHeight: number,
  toolbarWidth: number,
  toolbarHeight: number,
) {
  const maxX = Math.max(0, boundsWidth - toolbarWidth);
  const maxY = Math.max(0, boundsHeight - toolbarHeight);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}
