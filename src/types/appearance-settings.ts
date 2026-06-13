import type { ActionType } from "@/types/designer";

export type AppTheme = "light" | "dark";
export type PlayerDisplayMode = "number" | "circle";

export type ActionColorKey = ActionType | "label";

export interface AppearanceSettings {
  panelAccent: string;
  utilityBar: string;
  actionColors: Record<ActionColorKey, string>;
  headerColor: string;
  appFont: string;
  theme: AppTheme;
  playerDisplay: PlayerDisplayMode;
  allowFingerDraw: boolean;
  highContrastCourt: boolean;
  libraryColumns: {
    tableFont: number;
    season: number | null;
    listSplitPct: number;
    team: number | null;
    series: number | null;
    tags: number | null;
  };
  libraryFramesGrid: {
    columns: number;
    gap: number;
  };
  designerColumns: {
    tools: number | null;
    court: number | null;
    notes: number | null;
    frames: number | null;
    tableFont: number;
  };
}
