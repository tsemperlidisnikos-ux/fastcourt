import type { DesignerFrame, PlayDocument } from "@/types/designer";

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createFrame(name: string, index = 1): DesignerFrame {
  return {
    id: newId("frame"),
    name: name || `Frame ${index}`,
    objects: [],
    actions: [],
    actionSequence: [],
  };
}

export function createBlankPlay(title = "Untitled play"): PlayDocument {
  return {
    id: newId("play"),
    title,
    courtType: "half",
    frames: [createFrame("Frame 1", 1)],
    animSpeed: 1,
    animPauseMs: 800,
  };
}

export function createPlayFromLibraryItem(
  itemId: string,
  title: string,
): PlayDocument {
  const play = createBlankPlay(title);
  play.id = itemId;
  return play;
}
