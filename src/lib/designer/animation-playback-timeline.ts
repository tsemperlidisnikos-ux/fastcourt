import { buildAnimationSteps, getPlaybackActionIds } from "@/lib/designer/animation-engine";
import {
  ANIM_FINAL_HOLD_MS,
  ANIM_FRAME_TRANSITION_MS,
  frameActionStepDurationMs,
  resolvePlaybackSpeed,
  frameEmptyHoldDurationMs,
} from "@/lib/designer/animation-timing";
import type { PlayDocument } from "@/types/designer";

export type PlayTimelineSegment =
  | {
      kind: "action";
      frameIndex: number;
      durationMs: number;
      stepIndex: number;
    }
  | {
      kind: "transition";
      frameIndex: number;
      durationMs: number;
    }
  | {
      kind: "pause";
      frameIndex: number;
      durationMs: number;
    }
  | {
      kind: "hold-empty";
      frameIndex: number;
      durationMs: number;
    };

export type PlaybackPhase = "action" | "transition" | "inter-frame-pause";

export type PlaybackCursor = {
  frameIndex: number;
  stepIndex: number;
  phase: PlaybackPhase;
  elapsedMs: number;
};

function playSpeed(play: PlayDocument) {
  return resolvePlaybackSpeed(play.animSpeed);
}

export function buildPlayTimelineSegments(play: PlayDocument): PlayTimelineSegment[] {
  const speed = playSpeed(play);
  const segments: PlayTimelineSegment[] = [];

  for (let fi = 0; fi < play.frames.length; fi++) {
    const frame = play.frames[fi];
    const steps = buildAnimationSteps(frame);

    if (steps.length === 0) {
      segments.push({
        kind: "hold-empty",
        frameIndex: fi,
        durationMs: frameEmptyHoldDurationMs(frame, speed),
      });
    } else {
      const stepMs = frameActionStepDurationMs(frame, steps.length, speed);
      for (let step = 0; step < steps.length; step++) {
        segments.push({
          kind: "action",
          frameIndex: fi,
          durationMs: stepMs,
          stepIndex: step,
        });
      }
    }

    if (fi < play.frames.length - 1) {
      segments.push({
        kind: "transition",
        frameIndex: fi,
        durationMs: ANIM_FRAME_TRANSITION_MS,
      });
      segments.push({
        kind: "pause",
        frameIndex: fi + 1,
        durationMs: play.animPauseMs ?? 800,
      });
    }
  }

  if (play.frames.length > 0) {
    segments.push({
      kind: "hold-empty",
      frameIndex: play.frames.length - 1,
      durationMs: ANIM_FINAL_HOLD_MS,
    });
  }

  return segments;
}

export function getPlayTimelineDurationMs(play: PlayDocument) {
  return buildPlayTimelineSegments(play).reduce((sum, seg) => sum + seg.durationMs, 0);
}

function segmentMatchesCursor(
  segment: PlayTimelineSegment,
  cursor: PlaybackCursor,
): boolean {
  if (cursor.phase === "action") {
    return (
      segment.kind === "action" &&
      segment.frameIndex === cursor.frameIndex &&
      segment.stepIndex === cursor.stepIndex
    );
  }
  if (cursor.phase === "transition") {
    return segment.kind === "transition" && segment.frameIndex === cursor.frameIndex;
  }
  return segment.kind === "pause" && segment.frameIndex === cursor.frameIndex + 1;
}

export function computePlaybackCursorMs(
  play: PlayDocument,
  cursor: PlaybackCursor,
): number {
  const segments = buildPlayTimelineSegments(play);
  let offset = 0;

  for (const segment of segments) {
    if (segmentMatchesCursor(segment, cursor)) {
      return offset + Math.min(cursor.elapsedMs, segment.durationMs);
    }
    offset += segment.durationMs;
  }

  return offset;
}

export function computePlaybackProgress(
  play: PlayDocument,
  cursor: PlaybackCursor,
): number {
  const total = getPlayTimelineDurationMs(play);
  if (total <= 0) return 0;
  return Math.min(1, computePlaybackCursorMs(play, cursor) / total);
}

export function firstAnimatableFrameIndex(play: PlayDocument) {
  return play.frames.findIndex((frame) => getPlaybackActionIds(frame).length > 0);
}

export function playbackTimeMsFromProgress(play: PlayDocument, progress: number) {
  const total = getPlayTimelineDurationMs(play);
  if (total <= 0) return 0;
  return Math.min(total, Math.max(0, progress * total));
}

export function playbackCursorFromTimeMs(
  play: PlayDocument,
  timeMs: number,
): { cursor: PlaybackCursor; localProgress: number } | null {
  const segments = buildPlayTimelineSegments(play);
  if (!segments.length) return null;

  const clampedTime = Math.max(0, timeMs);
  let offset = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const next = offset + segment.durationMs;
    const isLast = index === segments.length - 1;
    if (clampedTime < next || isLast) {
      const elapsedMs = Math.min(
        segment.durationMs,
        Math.max(0, clampedTime - offset),
      );
      const localProgress =
        segment.durationMs > 0 ? elapsedMs / segment.durationMs : 0;

      if (segment.kind === "action") {
        return {
          cursor: {
            frameIndex: segment.frameIndex,
            stepIndex: segment.stepIndex,
            phase: "action",
            elapsedMs,
          },
          localProgress,
        };
      }

      if (segment.kind === "transition") {
        const steps = buildAnimationSteps(play.frames[segment.frameIndex]!);
        return {
          cursor: {
            frameIndex: segment.frameIndex,
            stepIndex: Math.max(0, steps.length - 1),
            phase: "transition",
            elapsedMs,
          },
          localProgress,
        };
      }

      if (segment.kind === "pause") {
        return {
          cursor: {
            frameIndex: segment.frameIndex - 1,
            stepIndex: 0,
            phase: "inter-frame-pause",
            elapsedMs,
          },
          localProgress,
        };
      }

      const steps = buildAnimationSteps(play.frames[segment.frameIndex]!);
      return {
        cursor: {
          frameIndex: segment.frameIndex,
          stepIndex: steps.length > 0 ? steps.length - 1 : 0,
          phase: "action",
          elapsedMs,
        },
        localProgress,
      };
    }
    offset = next;
  }

  return null;
}
