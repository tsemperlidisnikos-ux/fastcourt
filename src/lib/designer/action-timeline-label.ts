import { LINE_ACTION_CHOICES } from "@/lib/designer/action-constants";
import { closestOffenseAt } from "@/lib/designer/action-propagation";
import type { ActionType, DesignerAction, DesignerFrame, DesignerObject } from "@/types/designer";

function playerDisplayName(player: DesignerObject | null | undefined): string {
  if (!player) return "Player";
  const label = player.label?.trim();
  return label ? `Player ${label}` : "Player";
}

function typeLabel(type: ActionType): string {
  return (
    LINE_ACTION_CHOICES.find((c) => c.value === type)?.label ??
    type.charAt(0).toUpperCase() + type.slice(1)
  );
}

function actionStartPlayer(
  action: DesignerAction,
  frame: DesignerFrame,
): DesignerObject | null {
  if (action.sourcePlayerId) {
    const source = frame.objects.find((o) => o.id === action.sourcePlayerId);
    if (source?.kind === "offense") return source;
  }
  return closestOffenseAt(action.x1, action.y1, frame.objects);
}

function actionEndPlayer(
  action: DesignerAction,
  frame: DesignerFrame,
  excludeIds: string[] = [],
): DesignerObject | null {
  return closestOffenseAt(action.x2, action.y2, frame.objects, {}, excludeIds);
}

/** GeekHoops-style label, e.g. "Pass by Player 1 to Player 2". */
export function formatActionTimelineLabel(
  action: DesignerAction,
  frame: DesignerFrame,
): string {
  const type = typeLabel(action.type);
  const start = actionStartPlayer(action, frame);

  if (action.type === "pass" || action.type === "handoff") {
    const end = actionEndPlayer(
      action,
      frame,
      start ? [start.id] : [],
    );
    if (start && end) {
      return `${type} by ${playerDisplayName(start)} to ${playerDisplayName(end)}`;
    }
  }

  if (start) {
    return `${type} by ${playerDisplayName(start)}`;
  }

  return type;
}
