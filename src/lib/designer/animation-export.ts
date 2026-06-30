import { applyActionResultsToFrame } from "@/lib/designer/frame-propagation";
import {
  buildAnimationSteps,
  computeAnimStepState,
  computeAnimStepStateAtEased,
  getPlaybackActionIds,
  lerpObjects,
} from "@/lib/designer/animation-engine";
import { animEaseInOut } from "@/lib/designer/animation-timing";
import {
  buildPlayTimelineSegments,
  type PlayTimelineSegment,
} from "@/lib/designer/animation-playback-timeline";
import type { DesignerObject, PlayDocument } from "@/types/designer";

export type AnimRuntimeSnapshot = {
  active: boolean;
  objects: DesignerObject[];
  activeActionId: string | null;
  activeActionIds?: string[];
  revealedActionIds: string[];
  lineProgress: number;
  showActiveLine?: boolean;
};

export type AnimationExportSample = {
  frameIndex: number;
  runtime: AnimRuntimeSnapshot;
};

type TimelineSegment = PlayTimelineSegment;

export const DESIGNER_EXPORT_START_EVENT = "fc-designer-export-start";

export function notifyDesignerExportStarting() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DESIGNER_EXPORT_START_EVENT));
  }
}

export class AnimationExportAborted extends Error {
  constructor() {
    super("Animation export cancelled.");
    this.name = "AnimationExportAborted";
  }
}

function buildTimelineSegments(play: PlayDocument): TimelineSegment[] {
  return buildPlayTimelineSegments(play);
}

export function getAnimationExportDurationMs(play: PlayDocument) {
  return buildTimelineSegments(play).reduce((sum, seg) => sum + seg.durationMs, 0);
}

export function playHasExportableAnimation(play: PlayDocument) {
  if (!play.frames.length) return false;
  return play.frames.some((frame) => getPlaybackActionIds(frame).length > 0);
}

function sampleSegment(
  play: PlayDocument,
  segment: TimelineSegment,
  localProgress: number,
): AnimationExportSample {
  const frame = play.frames[segment.frameIndex];

  if (segment.kind === "action") {
    const eased = animEaseInOut(Math.min(1, Math.max(0, localProgress)));
    const state = computeAnimStepStateAtEased(
      frame,
      segment.stepIndex,
      eased,
      play.courtType,
    );
    return {
      frameIndex: segment.frameIndex,
      runtime: {
        active: true,
        objects: state.objects,
        activeActionId: state.activeActionId,
        activeActionIds: state.activeActionIds,
        revealedActionIds: state.revealedActionIds,
        lineProgress: state.lineProgress,
        showActiveLine: state.showActiveLine,
      },
    };
  }

  if (segment.kind === "transition") {
    const nextFrame = play.frames[segment.frameIndex + 1];
    const transitioned = applyActionResultsToFrame(frame, nextFrame, {
      clearActions: false,
    });
    const stepCount = buildAnimationSteps(frame).length;
    const fromObjs = computeAnimStepState(
      frame,
      stepCount,
      1,
      1,
      play.courtType,
    ).objects;
    const eased = animEaseInOut(Math.min(1, Math.max(0, localProgress)));
    const objects = lerpObjects(fromObjs, transitioned.objects, eased);
    return {
      frameIndex: segment.frameIndex,
      runtime: {
        active: true,
        objects,
        activeActionId: null,
        revealedActionIds: [],
        lineProgress: 1,
      },
    };
  }

  if (segment.kind === "pause") {
    const pauseFrame = play.frames[segment.frameIndex];
    const state = computeAnimStepState(pauseFrame, 0, 0, 0, play.courtType);
    return {
      frameIndex: segment.frameIndex,
      runtime: {
        active: true,
        objects: state.objects,
        activeActionId: null,
        revealedActionIds: [],
        lineProgress: 0,
      },
    };
  }

  const stepCount = buildAnimationSteps(frame).length;
  if (stepCount > 0) {
    const state = computeAnimStepState(frame, stepCount, 1, 1, play.courtType);
    return {
      frameIndex: segment.frameIndex,
      runtime: {
        active: true,
        objects: state.objects,
        activeActionId: null,
        revealedActionIds: [],
        lineProgress: 1,
      },
    };
  }

  return {
    frameIndex: segment.frameIndex,
    runtime: {
      active: true,
      objects: frame.objects,
      activeActionId: null,
      revealedActionIds: [],
      lineProgress: 1,
    },
  };
}

export function samplePlayAnimationAt(
  play: PlayDocument,
  timeMs: number,
): AnimationExportSample | null {
  if (!play.frames.length) return null;

  const segments = buildTimelineSegments(play);
  let cursor = 0;

  for (const segment of segments) {
    const next = cursor + segment.durationMs;
    if (timeMs < next) {
      const local = segment.durationMs > 0 ? (timeMs - cursor) / segment.durationMs : 0;
      return sampleSegment(play, segment, local);
    }
    cursor = next;
  }

  const last = segments[segments.length - 1];
  return sampleSegment(play, last, 1);
}

export function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function canExportPlayAnimationMp4() {
  return typeof VideoEncoder !== "undefined";
}

const H264_CODEC_CANDIDATES = ["avc1.42001f", "avc1.42E01E", "avc1.4d0032"];

async function pickH264Codec(width: number, height: number) {
  for (const codec of H264_CODEC_CANDIDATES) {
    const { supported } = await VideoEncoder.isConfigSupported({
      codec,
      width,
      height,
      bitrate: 4_000_000,
    });
    if (supported) return codec;
  }
  return null;
}

export async function exportPlayAnimationMp4(options: {
  play: PlayDocument;
  fps?: number;
  applySample: (sample: AnimationExportSample) => Promise<void>;
  captureToTarget: (target: HTMLCanvasElement) => boolean;
  onProgress?: (ratio: number) => void;
  signal?: AbortSignal;
}): Promise<Blob> {
  if (!canExportPlayAnimationMp4()) {
    throw new Error("This browser cannot encode MP4 video. Try Chrome or Edge.");
  }

  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");

  const fps = options.fps ?? 30;
  const durationMs = getAnimationExportDurationMs(options.play);
  const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  const frameDelayUs = Math.round(1_000_000 / fps);

  const exportCanvas = document.createElement("canvas");
  notifyDesignerExportStarting();

  const firstSample = samplePlayAnimationAt(options.play, 0);
  if (!firstSample) throw new Error("Could not sample animation.");
  await options.applySample(firstSample);
  if (!options.captureToTarget(exportCanvas)) {
    throw new Error("Could not capture court frame.");
  }

  const width = exportCanvas.width;
  const height = exportCanvas.height;
  const codec = await pickH264Codec(width, height);
  if (!codec) {
    throw new Error("This browser cannot encode MP4 video. Try Chrome or Edge.");
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: "avc",
      width,
      height,
    },
    fastStart: "in-memory",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error;
    },
  });

  encoder.configure({
    codec,
    width,
    height,
    bitrate: 4_000_000,
  });

  try {
    for (let i = 0; i < frameCount; i++) {
      if (options.signal?.aborted) throw new AnimationExportAborted();

      if (i > 0) {
        const sample = samplePlayAnimationAt(options.play, i * (1000 / fps));
        if (!sample) throw new Error("Could not sample animation.");
        await options.applySample(sample);
        if (!options.captureToTarget(exportCanvas)) {
          throw new Error("Could not capture court frame.");
        }
      }

      const frame = new VideoFrame(exportCanvas, {
        timestamp: i * frameDelayUs,
        duration: frameDelayUs,
      });
      encoder.encode(frame, { keyFrame: i % fps === 0 });
      frame.close();
      if (encoderError) throw encoderError;

      options.onProgress?.((i + 1) / frameCount);
      await waitForPaint();
    }
  } finally {
    if (encoder.state !== "closed") {
      await encoder.flush();
      encoder.close();
    }
    muxer.finalize();
  }

  const buffer = muxer.target.buffer;
  if (!buffer || buffer.byteLength < 256) {
    throw new Error("Export produced an empty video. Try Chrome or Edge.");
  }
  return new Blob([buffer], { type: "video/mp4" });
}
