import type { PracticeSessionItem } from "@/types/library-meta";

export interface PracticeDisruptionCue {
  liveCall?: string;
  filmRead?: string;
  readDetail?: string;
  broke?: string;
  designerFrameIndex?: number;
}

function parseNotesCue(notes: string): Omit<PracticeDisruptionCue, "designerFrameIndex"> {
  const parts = notes.split(" · ").map((part) => part.trim()).filter(Boolean);
  const result: Omit<PracticeDisruptionCue, "designerFrameIndex"> = {};

  for (const part of parts) {
    if (part.startsWith("Film read:")) {
      result.filmRead = part.slice("Film read:".length).trim();
    } else if (part.startsWith("Read:")) {
      result.readDetail = part.slice("Read:".length).trim();
    } else if (part.startsWith("Broke:")) {
      result.broke = part.slice("Broke:".length).trim();
    }
  }

  return result;
}

export function resolvePracticeDisruptionCue(
  item: PracticeSessionItem,
): PracticeDisruptionCue | null {
  const liveCall = item.liveCall?.trim();
  const notes = (item.notes || "").trim();
  const parsed = notes ? parseNotesCue(notes) : {};

  if (!liveCall && !parsed.filmRead && !parsed.readDetail && !parsed.broke) {
    return null;
  }

  return {
    liveCall: liveCall || parsed.readDetail,
    filmRead: parsed.filmRead,
    readDetail: parsed.readDetail,
    broke: parsed.broke,
    designerFrameIndex:
      typeof item.designerFrameIndex === "number" &&
      Number.isFinite(item.designerFrameIndex) &&
      item.designerFrameIndex >= 0
        ? Math.floor(item.designerFrameIndex)
        : undefined,
  };
}

export function formatPracticeLiveCall(cue: PracticeDisruptionCue): string | null {
  const call = cue.liveCall?.trim();
  if (call) return call;
  if (cue.filmRead?.trim()) return cue.filmRead.trim();
  return null;
}
