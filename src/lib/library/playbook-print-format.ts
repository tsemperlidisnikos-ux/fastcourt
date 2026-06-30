import type {
  PlaybookFormatOptions,
  PlaybookGridCount,
  PlaybookPageNumberPosition,
  PlaybookPrintFieldSource,
} from "@/types/playbook-print-config";
import type { StoredPlay } from "@/types/library";

export const PLAYBOOK_PRINT_FIELD_OPTIONS: {
  value: PlaybookPrintFieldSource;
  label: string;
}[] = [
  { value: "none", label: "None" },
  { value: "playbookTitle", label: "Playbook Title" },
  { value: "playName", label: "Play Name" },
  { value: "team", label: "Team" },
  { value: "series", label: "Series" },
];

export const PLAYBOOK_PAGE_NUMBER_OPTIONS: {
  value: PlaybookPageNumberPosition;
  label: string;
}[] = [
  { value: "footerLeft", label: "Footer Left" },
  { value: "footerCenter", label: "Footer Center" },
  { value: "footerRight", label: "Footer Right" },
  { value: "headerLeft", label: "Header Left" },
  { value: "headerRight", label: "Header Right" },
  { value: "none", label: "None" },
];

export const PLAYBOOK_GRID_COUNT_OPTIONS: PlaybookGridCount[] = [
  1, 2, 3, 4, 5, 6,
];

export const DEFAULT_PLAYBOOK_FORMAT_OPTIONS: PlaybookFormatOptions = {
  pageTitle: "playbookTitle",
  pageSubtitle: "playName",
  pageNumberPosition: "footerLeft",
  framesPerRow: 3,
  rowsPerPage: 3,
  playTitle: "playName",
  playSubtitle: "team",
  eachPlayNewLine: true,
};

export interface PlaybookPrintFieldContext {
  playbookName: string;
  displayTeam: string;
  play?: StoredPlay;
}

export function resolvePlaybookPrintField(
  source: PlaybookPrintFieldSource,
  ctx: PlaybookPrintFieldContext,
): string {
  switch (source) {
    case "playbookTitle":
      return (ctx.playbookName || "Playbook").trim();
    case "playName":
      return ctx.play?.title?.trim() ?? "";
    case "team": {
      const team = ctx.play?.team?.trim() || ctx.displayTeam.trim();
      return team && team !== "No Team" ? team : "";
    }
    case "series":
      return ctx.play?.series?.trim() ?? "";
    case "none":
    default:
      return "";
  }
}

export function getConfiguredPlaybookGrid(format: PlaybookFormatOptions) {
  const cols = format.framesPerRow;
  const rows = format.rowsPerPage;
  return {
    cols,
    rows,
    framesPerPage: cols * rows,
  };
}

export function getPlaybookChunkGridForLayout(
  itemCount: number,
  cols: number,
  maxRows: number,
) {
  const count = Math.max(0, itemCount);
  const rows = Math.min(maxRows, Math.max(1, Math.ceil(count / cols) || 1));
  const slots = rows * cols;
  return {
    rows,
    cols,
    padCount: Math.max(0, slots - count),
  };
}

export function shouldShowPlaybookPageNumbers(
  includePageNumbers: boolean,
  position: PlaybookPageNumberPosition,
): boolean {
  return includePageNumbers && position !== "none";
}
