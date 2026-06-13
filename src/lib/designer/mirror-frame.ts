import type { CourtType, DesignerAction, DesignerFrame, PlayDocument } from "@/types/designer";

function mirrorCoordX(x: number) {
  const nx = Number(x);
  if (!Number.isFinite(nx)) return x;
  return 1 - nx;
}

function mirrorPointsArrayX(points: number[]) {
  for (let i = 0; i < points.length; i += 2) {
    points[i] = mirrorCoordX(points[i]);
  }
}

function mirrorAction(action: DesignerAction): DesignerAction {
  const copy: DesignerAction = { ...action };
  if (copy.points?.length) {
    copy.points = [...copy.points];
    mirrorPointsArrayX(copy.points);
  }
  copy.x1 = mirrorCoordX(copy.x1);
  copy.x2 = mirrorCoordX(copy.x2);
  if (copy.midX != null) copy.midX = mirrorCoordX(copy.midX);
  if (copy.c1x != null) copy.c1x = mirrorCoordX(copy.c1x);
  if (copy.c2x != null) copy.c2x = mirrorCoordX(copy.c2x);
  return copy;
}

export function mirrorFrameHorizontal(
  frame: DesignerFrame,
  _courtType: CourtType,
): DesignerFrame {
  const next: DesignerFrame = JSON.parse(JSON.stringify(frame)) as DesignerFrame;

  next.objects = next.objects.map((object) => ({
    ...object,
    x: mirrorCoordX(object.x),
  }));

  next.actions = next.actions.map((action) => mirrorAction(action));

  if (next.whiteboardStrokes?.length) {
    next.whiteboardStrokes = next.whiteboardStrokes.map((stroke) => {
      const points = [...stroke.points];
      mirrorPointsArrayX(points);
      return { ...stroke, points };
    });
  }

  return next;
}

export function mirrorPlayHorizontal(play: PlayDocument): PlayDocument {
  return {
    ...play,
    frames: play.frames.map((frame) => mirrorFrameHorizontal(frame, play.courtType)),
  };
}
