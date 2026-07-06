import { primaryFrameLabel } from "@/lib/designer/frame-read-branch";
import type { DesignerCoachAlternative } from "@/lib/designer/analyze-play-locally";
import type { DesignerCoachPlayContext } from "@/lib/designer/analyze-play-locally";

const MAX_SAME_PLAY_ALTERNATIVES = 4;

function alternativePriority(
  scorePct: number,
): DesignerCoachAlternative["priority"] {
  if (scorePct >= 80) return "medium";
  return "low";
}

function scoreSamePlayFrame(
  play: DesignerCoachPlayContext,
  currentFrameIndex: number,
  frameIndex: number,
): { scorePct: number; detail: string } {
  const frames = play.frames;
  const currentFrame = frames[currentFrameIndex];
  const candidate = frames[frameIndex];
  if (!currentFrame || !candidate) {
    return { scorePct: 0, detail: "" };
  }

  const currentLabel = primaryFrameLabel(currentFrame, currentFrameIndex);
  const candidateLabel = primaryFrameLabel(candidate, frameIndex);
  const parentId = currentFrame.readBranch?.parentFrameId;

  if (candidate.readBranch?.parentFrameId === currentFrame.id) {
    const coverage = candidate.readBranch.coverage?.toUpperCase();
    return {
      scorePct: 92,
      detail: `Read branch "${candidateLabel}"${
        coverage ? ` (${coverage})` : ""
      } — replace ${currentLabel} with this read.`,
    };
  }

  if (parentId && candidate.id === parentId) {
    return {
      scorePct: 88,
      detail: `Primary frame "${candidateLabel}" — swap back to the base look on ${currentLabel}.`,
    };
  }

  if (
    parentId &&
    candidate.readBranch?.parentFrameId === parentId &&
    candidate.id !== currentFrame.id
  ) {
    return {
      scorePct: 78,
      detail: `Sibling read "${candidateLabel}" — another branch from the same action.`,
    };
  }

  if (!candidate.readBranch?.parentFrameId) {
    return {
      scorePct: 66,
      detail: `Frame "${candidateLabel}" in this play — alternative setup for ${currentLabel}.`,
    };
  }

  return {
    scorePct: 54,
    detail: `Frame "${candidateLabel}" elsewhere in "${play.title}".`,
  };
}

/** Other frames in the open play that can replace the current frame. */
export function buildSamePlayFrameAlternatives(
  play: DesignerCoachPlayContext,
  currentFrameIndex: number,
): DesignerCoachAlternative[] {
  if (play.frames.length <= 1) return [];

  const playId = play.id ?? "current-play";
  const playTitle = play.title?.trim() || "This play";
  const ranked: DesignerCoachAlternative[] = [];

  for (let frameIndex = 0; frameIndex < play.frames.length; frameIndex += 1) {
    if (frameIndex === currentFrameIndex) continue;
    const frame = play.frames[frameIndex];
    if (!frame) continue;

    const { scorePct, detail } = scoreSamePlayFrame(
      play,
      currentFrameIndex,
      frameIndex,
    );
    if (scorePct <= 0) continue;

    ranked.push({
      kind: "same-play",
      title: primaryFrameLabel(frame, frameIndex),
      detail,
      priority: alternativePriority(scorePct),
      playId,
      playTitle,
      scorePct,
      frameIndex,
    });
  }

  return ranked
    .sort((left, right) => {
      if (right.scorePct !== left.scorePct) {
        return right.scorePct - left.scorePct;
      }
      return left.frameIndex - right.frameIndex;
    })
    .slice(0, MAX_SAME_PLAY_ALTERNATIVES);
}
