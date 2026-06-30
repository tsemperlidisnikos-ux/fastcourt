import type { ActionType } from "@/types/designer";

export type AppTheme = "light" | "dark";
export type PlayerDisplayMode = "number" | "circle";
export type CourtRenderMode = "vector" | "image";

export type ActionColorKey = ActionType | "label";

export interface AppearanceSettings {
  actionColors: Record<ActionColorKey, string>;
  headerColor: string;
  /** Middle library header row (app logo, team name, club logo). */
  headerBrandRowColor: string;
  /** Border/frame color for the active library nav tab (Draw, Playbooks, …). */
  headerNavActiveColor: string;
  /** Font size (px) for library nav tabs: Draw, Playbooks, Fields, Practice, Players. */
  headerNavTabFontSize: number;
  appFont: string;
  theme: AppTheme;
  playerDisplay: PlayerDisplayMode;
  allowFingerDraw: boolean;
  highContrastCourt: boolean;
  /** Vector court floor fill (NCAA-style diagram). */
  courtFloorColor: string;
  /** Vector court line / key stroke color. */
  courtLineColor: string;
  /** Vector diagram (custom colors) or legacy PNG court image. */
  courtRenderMode: CourtRenderMode;
  /** Hoops Geek wood preset: vertical plank stripes on the floor. */
  courtShowWoodTiles: boolean;
  libraryColumns: {
    tableFont: number;
    season: number | null;
    type: number | null;
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
