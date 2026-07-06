import type { DesignerCoachPlayContext } from "@/lib/designer/analyze-play-locally";

export function buildCoachAlternativesEmptyMessage(input: {
  play: DesignerCoachPlayContext;
  libraryCount: number;
  hasGamePlan: boolean;
}): string {
  const frameCount = input.play.frames.length;
  const parts: string[] = [];

  if (frameCount <= 1) {
    parts.push("Add another frame to this play for same-play looks");
  }

  if (input.libraryCount <= 1) {
    parts.push("save more plays in your library for DNA matches");
  } else if (!input.hasGamePlan) {
    parts.push(
      "link a game plan for series / playbook / prep-read suggestions",
    );
  } else {
    parts.push(
      "try tags or series on related plays, or run Ask AI for tactical ideas",
    );
  }

  return `No importable alternatives yet — ${parts.join("; ")}.`;
}

export function isDrillCoachContext(type: string | undefined) {
  return type === "drill";
}
