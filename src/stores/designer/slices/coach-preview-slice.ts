import type { DesignerCoachFix } from "@/lib/designer/designer-coach-apply";
import type { DesignerSliceCreator } from "../slice-types";

export const createCoachPreviewSlice: DesignerSliceCreator = (set) => ({
  coachPreviewFixes: null,

  setCoachPreviewFixes: (fixes) => set({ coachPreviewFixes: fixes }),

  clearCoachPreviewFixes: () => set({ coachPreviewFixes: null }),
});

export type CoachPreviewSlice = {
  coachPreviewFixes: DesignerCoachFix[] | null;
  setCoachPreviewFixes: (fixes: DesignerCoachFix[] | null) => void;
  clearCoachPreviewFixes: () => void;
};
