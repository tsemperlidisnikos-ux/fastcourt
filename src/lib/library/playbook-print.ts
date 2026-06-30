import type { CourtType } from "@/types/designer";
import type { LibraryItemType, StoredPlay } from "@/types/library";
import type { PlaybookFormatOptions } from "@/types/playbook-print-config";
import {
  getConfiguredPlaybookGrid,
  getPlaybookChunkGridForLayout,
} from "@/lib/library/playbook-print-format";

export const FASTDRAW_FRAMES_PER_PAGE_LANDSCAPE = 9;
export const FASTDRAW_FRAMES_PER_PAGE_PORTRAIT = 6;
export const FASTDRAW_FRAMES_PER_PAGE_COMPACT = 4;
export const FASTDRAW_TOC_ENTRIES_PER_PAGE = 17;
export const FASTDRAW_GRID_COLS = 3;
export const FASTDRAW_GRID_COLS_COMPACT = 2;

export type PlaybookPrintOrientation = "landscape" | "portrait";

export interface PlaybookGridLayout {
  framesPerPage: number;
  rows: number;
  cols: number;
  gridClass: "fd-grid-9" | "fd-grid-6" | "fd-grid-3" | "fd-grid-4" | "fd-grid-custom";
}

export function getPlaybookGridLayout(format?: PlaybookFormatOptions): PlaybookGridLayout {
  if (format) {
    const { cols, rows, framesPerPage } = getConfiguredPlaybookGrid(format);
    const gridClass =
      cols === 2 && rows === 2
        ? "fd-grid-4"
        : cols === 3 && rows === 1
          ? "fd-grid-3"
          : cols === 3 && rows === 2
            ? "fd-grid-6"
            : cols === 3 && rows === 3
              ? "fd-grid-9"
              : "fd-grid-custom";
    return {
      framesPerPage,
      rows,
      cols,
      gridClass,
    };
  }

  // FastDraw classic layout: up to 3×3 frames per content page.
  return {
    framesPerPage: FASTDRAW_FRAMES_PER_PAGE_LANDSCAPE,
    rows: 3,
    cols: FASTDRAW_GRID_COLS,
    gridClass: "fd-grid-9",
  };
}

/** Grid rows / padding for a partial page chunk. */
export function getPlaybookChunkGrid(
  itemCount: number,
  format?: PlaybookFormatOptions,
): {
  rows: number;
  cols: number;
  gridClass: "fd-grid-9" | "fd-grid-6" | "fd-grid-3" | "fd-grid-4" | "fd-grid-custom";
  padCount: number;
} {
  if (format) {
    const layout = getConfiguredPlaybookGrid(format);
    const chunk = getPlaybookChunkGridForLayout(
      itemCount,
      layout.cols,
      layout.rows,
    );
    const gridClass =
      layout.cols === 2 && layout.rows === 2
        ? "fd-grid-4"
        : layout.cols === 3 && chunk.rows === 1
          ? "fd-grid-3"
          : layout.cols === 3 && chunk.rows === 2
            ? "fd-grid-6"
            : layout.cols === 3 && chunk.rows === 3
              ? "fd-grid-9"
              : "fd-grid-custom";
    return { ...chunk, gridClass };
  }

  const cols = FASTDRAW_GRID_COLS;
  const count = Math.max(0, itemCount);
  const rows = Math.min(3, Math.max(1, Math.ceil(count / cols) || 1));
  const slots = rows * cols;
  return {
    rows,
    cols,
    gridClass: rows === 1 ? "fd-grid-3" : rows === 2 ? "fd-grid-6" : "fd-grid-9",
    padCount: Math.max(0, slots - count),
  };
}

export interface PlaybookPrintSettings {
  includeCover: boolean;
  includeToc: boolean;
  includeNotes: boolean;
  includePageNumbers: boolean;
  eachPlaySeparatePage?: boolean;
  orientation?: PlaybookPrintOrientation;
  format?: PlaybookFormatOptions;
  overwriteClassicLayout?: boolean;
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
  const grid = getPlaybookGridLayout(settings.format);
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

export type PlaybookPageKind = "cover" | "toc" | "section" | "content";

export interface PlaybookPageDescriptor {
  index: number;
  pageNum: number;
  kind: PlaybookPageKind;
  label: string;
  playId?: string;
  contentSheetIndex?: number;
  tocPageIndex?: number;
}

export function buildPlaybookPageList(
  plays: StoredPlay[],
  settings: PlaybookPrintSettings,
): { pages: PlaybookPageDescriptor[]; pagination: PlaybookPagination } {
  const pagination = computePlaybookPagination(plays, settings);
  const pages: PlaybookPageDescriptor[] = [];
  let index = 0;

  if (settings.includeCover !== false) {
    pages.push({
      index,
      pageNum: 1,
      kind: "cover",
      label: "Cover",
    });
    index += 1;
  }

  if (settings.includeToc !== false && plays.length > 0) {
    for (let p = 0; p < pagination.tocPages; p += 1) {
      pages.push({
        index,
        pageNum: pagination.coverPages + p + 1,
        kind: "toc",
        label: p === 0 ? "Contents" : `Contents (${p + 1})`,
        tocPageIndex: p,
      });
      index += 1;
    }
  }

  pagination.contentSheets.forEach((sheet, sheetIndex) => {
    const pageNum = pagination.coverPages + pagination.tocPages + sheetIndex + 1;
    if (sheet.type === "section") {
      pages.push({
        index,
        pageNum,
        kind: "section",
        label: sheet.label || "Section",
        contentSheetIndex: sheetIndex,
      });
    } else {
      const playLabel = sheet.play.title || "Play";
      pages.push({
        index,
        pageNum,
        kind: "content",
        label: sheet.playContinued ? `${playLabel} (cont.)` : playLabel,
        playId: sheet.play.id,
        contentSheetIndex: sheetIndex,
      });
    }
    index += 1;
  });

  return { pages, pagination };
}

export function findPlaybookPageIndexForPlay(
  pages: PlaybookPageDescriptor[],
  playId: string,
): number {
  const match = pages.find(
    (page) => page.kind === "content" && page.playId === playId && !page.label.endsWith("(cont.)"),
  );
  return match?.index ?? pages.find((page) => page.playId === playId)?.index ?? 0;
}

export function stripNotesForPrint(notes: string): string {
  if (!notes) return "";

  const normalize = (raw: string) =>
    raw
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*p\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  if (typeof document === "undefined") {
    return normalize(notes);
  }
  const el = document.createElement("div");
  el.innerHTML = notes;
  return normalize(el.textContent ?? notes);
}
