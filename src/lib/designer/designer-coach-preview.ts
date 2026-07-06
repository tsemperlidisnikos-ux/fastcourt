import {
  applyFixesToFrame,
  type DesignerCoachFix,
} from "@/lib/designer/designer-coach-apply";
import type { DesignerFrame, DesignerObject } from "@/types/designer";

export interface CoachPreviewGhost {
  id: string;
  object: DesignerObject;
  fromX?: number;
  fromY?: number;
}

/** Ghost markers for coach fixes — target positions after apply. */
export function buildCoachPreviewGhosts(
  frame: DesignerFrame,
  fixes: DesignerCoachFix[],
): CoachPreviewGhost[] {
  if (!fixes.length) return [];

  const patched = applyFixesToFrame(frame, fixes);
  const ghosts: CoachPreviewGhost[] = [];
  const seen = new Set<string>();

  for (const fix of fixes) {
    switch (fix.type) {
      case "move": {
        const original = frame.objects.find((object) => object.id === fix.objectId);
        const updated = patched.objects.find((object) => object.id === fix.objectId);
        if (!original || !updated) break;
        if (
          Math.hypot(original.x - updated.x, original.y - updated.y) < 0.001
        ) {
          break;
        }
        ghosts.push({
          id: `ghost-move-${fix.objectId}`,
          object: { ...updated },
          fromX: original.x,
          fromY: original.y,
        });
        seen.add(fix.objectId);
        break;
      }
      case "addDefense": {
        const added = patched.objects.find((object) => object.id === fix.objectId);
        if (added) {
          ghosts.push({ id: fix.objectId, object: { ...added } });
        }
        break;
      }
      case "setDefenseStyle": {
        if (seen.has(fix.objectId)) break;
        const updated = patched.objects.find((object) => object.id === fix.objectId);
        if (updated) {
          ghosts.push({
            id: `ghost-style-${fix.objectId}`,
            object: { ...updated },
          });
        }
        break;
      }
      default:
        break;
    }
  }

  return ghosts;
}
