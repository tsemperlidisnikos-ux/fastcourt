export const SHUTTLE_WHEEL_SIZE_PX = 180;
export const SHUTTLE_FLOAT_PADDING_PX = 12;
/** Hold the wheel this long to drag it to a new position. */
export const SHUTTLE_LONG_PRESS_MS = 650;

export function defaultShuttlePosition(boundsWidth: number, boundsHeight: number) {
  const widgetSize = SHUTTLE_WHEEL_SIZE_PX;
  const x = SHUTTLE_FLOAT_PADDING_PX;
  const y = Math.max(
    SHUTTLE_FLOAT_PADDING_PX,
    boundsHeight - widgetSize - 88,
  );
  return clampShuttlePosition(x, y, boundsWidth, boundsHeight, widgetSize, widgetSize);
}

export function clampShuttlePosition(
  x: number,
  y: number,
  boundsWidth: number,
  boundsHeight: number,
  widgetWidth: number,
  widgetHeight: number,
) {
  const maxX = Math.max(0, boundsWidth - widgetWidth);
  const maxY = Math.max(0, boundsHeight - widgetHeight);
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}
