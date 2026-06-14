import type { CourtType } from "@/types/designer";
import type { LibraryItemType, StoredPlay } from "@/types/library";

export const FASTDRAW_FRAMES_PER_PAGE_LANDSCAPE = 9;
export const FASTDRAW_FRAMES_PER_PAGE_PORTRAIT = 6;
export const FASTDRAW_TOC_ENTRIES_PER_PAGE = 17;
export const FASTDRAW_GRID_COLS = 3;

export type PlaybookPrintOrientation = "landscape" | "portrait";

export interface PlaybookGridLayout {
  framesPerPage: number;
  rows: number;
  cols: number;
  gridClass: "fd-grid-9" | "fd-grid-6";
}

export function getPlaybookGridLayout(): PlaybookGridLayout {
  // FastDraw classic layout: 3×3 grid on every content page (portrait or landscape).
  return {
    framesPerPage: FASTDRAW_FRAMES_PER_PAGE_LANDSCAPE,
    rows: 3,
    cols: FASTDRAW_GRID_COLS,
    gridClass: "fd-grid-9",
  };
}

export interface PlaybookPrintSettings {
  includeCover: boolean;
  includeToc: boolean;
  includeNotes: boolean;
  includePageNumbers: boolean;
  eachPlaySeparatePage?: boolean;
  orientation?: PlaybookPrintOrientation;
}

export const DEFAULT_PLAYBOOK_PRINT_SETTINGS: PlaybookPrintSettings = {
  includeCover: true,
  includeToc: true,
  includeNotes: true,
  includePageNumbers: true,
  eachPlaySeparatePage: true,
};

export interface PlaybookFrameItem {
  playId: string;
  playTitle: string;
  series: string;
  frameId: string;
  frameName: string;
  notes: string;
  frameNum: number;
  frameTotal: number;
  courtType: CourtType;
  playType: LibraryItemType;
  team?: string;
  frame: StoredPlay["frames"][number];
}

export type PlaybookContentSheet =
  | { type: "section"; label: string; count: number }
  | {
      type: "grid";
      play: StoredPlay;
      items: PlaybookFrameItem[];
      playHeader: boolean;
      playContinued: boolean;
    };

export interface PlaybookPagination {
  contentSheets: PlaybookContentSheet[];
  coverPages: number;
  tocPages: number;
  contentPages: number;
  totalPages: number;
  firstContentPage: number;
  playStartPages: number[];
}

export interface PlaybookTocEntry {
  num: string;
  label: string;
  page: number;
  indent: number;
  group?: boolean;
}

export function getPlaybookBadgeLabel(play: {
  type: LibraryItemType;
  series?: string;
}): string {
  const series = play.series?.trim();
  if (series) return series;
  return play.type === "drill" ? "Drill" : "Play";
}

export function computePlaybookPagination(
  plays: StoredPlay[],
  settings: PlaybookPrintSettings,
): PlaybookPagination {
  const grid = getPlaybookGridLayout();
  const framesPerPage = grid.framesPerPage;
  const includeToc = settings.includeToc !== false && plays.length > 0;
  const coverPages = settings.includeCover !== false ? 1 : 0;
  const tocPages = includeToc
    ? Math.max(
        1,
        Math.ceil((plays.length + 2) / FASTDRAW_TOC_ENTRIES_PER_PAGE),
      )
    : 0;

  const contentSheets: PlaybookContentSheet[] = [];
  const playStartPages: number[] = [];
  let cursorPage = coverPages + tocPages + 1;

  plays.forEach((play) => {
    playStartPages.push(cursorPage);

    const frameItems: PlaybookFrameItem[] = play.frames.map((frame, frameIndex) => ({
      playId: play.id,
      playTitle: play.title,
      series: play.series ?? "",
      frameId: frame.id,
      frameName: frame.name || `Frame ${frameIndex + 1}`,
      notes: (frame.notes ?? "").trim(),
      frameNum: frameIndex + 1,
      frameTotal: play.frames.length,
      courtType: play.courtType,
      playType: play.type,
      team: play.team,
      frame,
    }));

    for (let i = 0; i < frameItems.length; i += framesPerPage) {
      contentSheets.push({
        type: "grid",
        play,
        items: frameItems.slice(i, i + framesPerPage),
        playHeader: i === 0,
        playContinued: i > 0,
      });
      cursorPage++;
    }

    if (!frameItems.length) {
      contentSheets.push({
        type: "grid",
        play,
        items: [],
        playHeader: true,
        playContinued: false,
      });
      cursorPage++;
    }
  });

  const totalPages = coverPages + tocPages + contentSheets.length;
  const firstContentPage = coverPages + tocPages + 1;

  return {
    contentSheets,
    coverPages,
    tocPages,
    contentPages: contentSheets.length,
    totalPages,
    firstContentPage,
    playStartPages,
  };
}

export function buildPlaybookTocEntries(
  plays: StoredPlay[],
  pagination: PlaybookPagination,
  playbookName: string,
  coachLine = "",
): PlaybookTocEntry[] {
  const { playStartPages, firstContentPage } = pagination;
  const sectionName = playbookName || "Playbook";
  const entries: PlaybookTocEntry[] = [];

  if (coachLine) {
    entries.push({
      num: "1.",
      label: coachLine,
      page: firstContentPage,
      indent: 0,
    });
  }

  entries.push({
    num: "1.1",
    label: sectionName,
    page: firstContentPage,
    indent: 1,
  });

  plays.forEach((play, i) => {
    entries.push({
      num: `1.1.${i + 1}`,
      label: play.title || "Untitled",
      page: playStartPages[i] ?? firstContentPage,
      indent: 2,
    });
  });

  return entries;
}

export function stripNotesForPrint(notes: string): string {
  if (!notes) return "";
  if (typeof document === "undefined") {
    return notes.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const el = document.createElement("div");
  el.innerHTML = notes;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}
