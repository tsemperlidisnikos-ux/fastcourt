import type { DesignerFrame, FrameReadBranch } from "@/types/designer";

export function isReadFrame(frame: DesignerFrame): boolean {
  return Boolean(frame.readBranch?.label?.trim());
}

export function readFramesForParent(
  frames: DesignerFrame[],
  parentFrameId: string,
): DesignerFrame[] {
  return frames.filter((frame) => frame.readBranch?.parentFrameId === parentFrameId);
}

export function primaryFrameLabel(frame: DesignerFrame, index: number): string {
  if (frame.readBranch?.label?.trim()) {
    return frame.readBranch.label.trim();
  }
  return frame.name?.trim() || `Frame ${index + 1}`;
}

export function frameThumbBadge(frame: DesignerFrame): string | null {
  if (!frame.readBranch?.coverage && !frame.readBranch?.label) return null;
  if (frame.readBranch.coverage) {
    return frame.readBranch.coverage.toUpperCase();
  }
  return "READ";
}

export function defaultReadBranchForCoverage(
  coverage: string,
  parentFrameId: string,
  label: string,
): FrameReadBranch {
  return {
    label: label.trim() || `If ${coverage.toUpperCase()}`,
    coverage: coverage.trim() || undefined,
    parentFrameId,
  };
}
