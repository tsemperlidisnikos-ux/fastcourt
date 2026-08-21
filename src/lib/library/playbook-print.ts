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
  sortBySeries?: boolean;
  sortByTags?: boolean;
}

export const DEFAULT_PLAYBOOK_PRINT_SETTINGS: PlaybookPrintSettings = {
  includeCover: true,
  includeToc: true,
  includeNotes: true,
  includePageNumbers: true,
  eachPlaySeparatePage: true,
  sortBySeries: false,
  sortByTags: false,
};

function comparePlaybookSortKey(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function playTagsKey(play: StoredPlay) {
  return (play.tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

function playGroupKey(
  play: StoredPlay,
  bySeries: boolean,
  byTags: boolean,
): string {
  if (bySeries && byTags) {
    return `${play.series?.trim() || "\0"}||${playTagsKey(play).toLowerCase()}`;
  }
  if (bySeries) return play.series?.trim() || "\0";
  if (byTags) return playTagsKey(play).toLowerCase() || "\0";
  return play.id;
}

function playGroupLabel(
  play: StoredPlay,
  bySeries: boolean,
  byTags: boolean,
): string {
  if (bySeries && byTags) {
    const series = play.series?.trim();
    const tags = playTagsKey(play);
    if (series && tags) return `${series} · ${tags}`;
    return series || tags || "Ungrouped";
  }
  if (bySeries) return play.series?.trim() || "No series";
  if (byTags) return playTagsKey(play) || "No tags";
  return play.title?.trim() || "Untitled";
}

function framesForPlay(play: StoredPlay): PlaybookFrameItem[] {
  return play.frames.map((frame, frameIndex) => ({
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
    courtView: play.courtView,
  }));
}

const PAD_FRAME_STUB: StoredPlay["frames"][number] = {
  id: "__pad__",
  name: "",
  objects: [],
  actions: [],
};

function makeRowPadItem(play: StoredPlay, padIndex: number): PlaybookFrameItem {
  return {
    playId: play.id,
    playTitle: "",
    series: play.series ?? "",
    frameId: `__pad__${play.id}__${padIndex}`,
    frameName: "",
    notes: "",
    frameNum: 0,
    frameTotal: 0,
    courtType: play.courtType,
    playType: play.type,
    team: play.team,
    frame: PAD_FRAME_STUB,
    courtView: play.courtView,
    isPad: true,
  };
}

function makePlayTitleItem(play: StoredPlay): PlaybookFrameItem {
  return {
    playId: play.id,
    playTitle: play.title?.trim() || "Untitled",
    series: play.series ?? "",
    frameId: `__title__${play.id}`,
    frameName: "",
    notes: "",
    frameNum: 0,
    frameTotal: 0,
    courtType: play.courtType,
    playType: play.type,
    team: play.team,
    frame: PAD_FRAME_STUB,
    courtView: play.courtView,
    isPlayTitle: true,
  };
}

/** How many grid slots an item consumes (play titles are banners, not frame slots). */
export function playbookItemSlotCount(
  item: PlaybookFrameItem,
  _cols: number,
): number {
  if (item.isPlayTitle) return 0;
  return 1;
}

export function playbookItemsSlotCount(
  items: PlaybookFrameItem[],
  cols: number,
): number {
  return items.reduce(
    (sum, item) => sum + playbookItemSlotCount(item, cols),
    0,
  );
}

function chunkItemsByPageCapacity(
  items: PlaybookFrameItem[],
  framesPerPage: number,
  cols: number,
): PlaybookFrameItem[][] {
  const chunks: PlaybookFrameItem[][] = [];
  let current: PlaybookFrameItem[] = [];
  let used = 0;

  for (const item of items) {
    const need = playbookItemSlotCount(item, cols);
    // Titles are free height banners — keep them with following frames.
    // If the page is already full, start the title on the next page.
    const fits = item.isPlayTitle
      ? used < framesPerPage
      : used + need <= framesPerPage;

    if (current.length > 0 && !fits) {
      chunks.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += need;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Flatten group plays into one slot list. When eachPlayNewLine is on,
 * pad the current row so the next play starts in column 1.
 * When includePlayTitles is on, insert a full-row play name before frames.
 */
function packGroupFrameItems(
  plays: StoredPlay[],
  cols: number,
  eachPlayNewLine: boolean,
  includePlayTitles: boolean,
): PlaybookFrameItem[] {
  const items: PlaybookFrameItem[] = [];
  let padSeq = 0;

  for (const play of plays) {
    const frames = framesForPlay(play);
    if (!frames.length) continue;

    if (eachPlayNewLine && items.length > 0) {
      const rem = playbookItemsSlotCount(items, cols) % cols;
      if (rem !== 0) {
        const padsNeeded = cols - rem;
        for (let i = 0; i < padsNeeded; i += 1) {
          items.push(makeRowPadItem(play, padSeq++));
        }
      }
    }

    if (includePlayTitles) {
      items.push(makePlayTitleItem(play));
    }

    items.push(...frames);
  }

  return items;
}

/** Order plays for print/preview when Layout Options sort flags are on. */
export function sortPlaysForPlaybookPrint(
  plays: StoredPlay[],
  options: { sortBySeries?: boolean; sortByTags?: boolean },
): StoredPlay[] {
  const bySeries = Boolean(options.sortBySeries);
  const byTags = Boolean(options.sortByTags);
  if (!bySeries && !byTags) return plays;

  return [...plays].sort((left, right) => {
    if (bySeries) {
      const cmp = comparePlaybookSortKey(
        left.series?.trim() || "",
        right.series?.trim() || "",
      );
      if (cmp !== 0) return cmp;
    }
    if (byTags) {
      const cmp = comparePlaybookSortKey(playTagsKey(left), playTagsKey(right));
      if (cmp !== 0) return cmp;
    }
    return comparePlaybookSortKey(left.title || "", right.title || "");
  });
}

function groupPlaysForPrint(
  plays: StoredPlay[],
  bySeries: boolean,
  byTags: boolean,
): { key: string; label: string; plays: StoredPlay[] }[] {
  if (!bySeries && !byTags) {
    return plays.map((play) => ({
      key: play.id,
      label: play.title?.trim() || "Untitled",
      plays: [play],
    }));
  }

  const groups: { key: string; label: string; plays: StoredPlay[] }[] = [];
  for (const play of plays) {
    const key = playGroupKey(play, bySeries, byTags);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.plays.push(play);
      continue;
    }
    groups.push({
      key,
      label: playGroupLabel(play, bySeries, byTags),
      plays: [play],
    });
  }
  return groups;
}

/** Entries in TOC before page numbers are known (for page-count estimate). */
function estimatePlaybookTocEntryCount(
  plays: StoredPlay[],
  bySeries: boolean,
  byTags: boolean,
): number {
  // Playbook section + one row per play; group mode adds a header per group.
  let count = 1 + plays.length;
  if (bySeries || byTags) {
    count += groupPlaysForPrint(plays, bySeries, byTags).length;
  }
  return count;
}

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
  courtView?: StoredPlay["courtView"];
  /** Invisible spacer so the next play starts on a new grid row. */
  isPad?: boolean;
  /** Full-width centered play name row before that play's frames. */
  isPlayTitle?: boolean;
}

export type PlaybookContentSheet =
  | { type: "section"; label: string; count: number }
  | {
      type: "grid";
      play: StoredPlay;
      items: PlaybookFrameItem[];
      playHeader: boolean;
      playContinued: boolean;
      /** When sorting by series/tags, shared group label for the sheet header. */
      groupLabel?: string;
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
  const bySeries = Boolean(
    settings.sortBySeries ?? settings.format?.sortBySeries,
  );
  const byTags = Boolean(settings.sortByTags ?? settings.format?.sortByTags);
  const groupMode = bySeries || byTags;
  const orderedPlays = sortPlaysForPlaybookPrint(plays, {
    sortBySeries: bySeries,
    sortByTags: byTags,
  });
  const grid = getPlaybookGridLayout(settings.format);
  const framesPerPage = grid.framesPerPage;
  const includeToc = settings.includeToc !== false && orderedPlays.length > 0;
  const coverPages = settings.includeCover !== false ? 1 : 0;
  const tocEntryEstimate = estimatePlaybookTocEntryCount(
    orderedPlays,
    bySeries,
    byTags,
  );
  const tocPages = includeToc
    ? Math.max(
        1,
        Math.ceil(tocEntryEstimate / FASTDRAW_TOC_ENTRIES_PER_PAGE),
      )
    : 0;

  const contentSheets: PlaybookContentSheet[] = [];
  const playStartPages: number[] = [];
  const playStartById = new Map<string, number>();
  let cursorPage = coverPages + tocPages + 1;

  const groups = groupPlaysForPrint(orderedPlays, bySeries, byTags);
  const eachPlayNewLine = settings.format?.eachPlayNewLine !== false;
  const includePlayTitles =
    groupMode && settings.format?.showPlayTitles !== false;
  const cols = grid.cols;

  for (const group of groups) {
    const frameItems = packGroupFrameItems(
      group.plays,
      cols,
      eachPlayNewLine,
      includePlayTitles,
    );
    const headerPlay = group.plays[0]!;

    if (!frameItems.length) {
      for (const play of group.plays) {
        if (!playStartById.has(play.id)) {
          playStartById.set(play.id, cursorPage);
        }
      }
      contentSheets.push({
        type: "grid",
        play: headerPlay,
        items: [],
        playHeader: true,
        playContinued: false,
        groupLabel: groupMode ? group.label : undefined,
      });
      cursorPage++;
      continue;
    }

    const chunks = chunkItemsByPageCapacity(
      frameItems,
      framesPerPage,
      cols,
    );
    chunks.forEach((chunk, chunkIndex) => {
      for (const item of chunk) {
        if (item.isPad) continue;
        if (!playStartById.has(item.playId)) {
          playStartById.set(item.playId, cursorPage);
        }
      }
      const firstReal = chunk.find((item) => !item.isPad);
      const chunkPlay =
        group.plays.find((play) => play.id === firstReal?.playId) ?? headerPlay;
      contentSheets.push({
        type: "grid",
        play: chunkPlay,
        items: chunk,
        playHeader: chunkIndex === 0,
        playContinued: chunkIndex > 0,
        groupLabel: groupMode ? group.label : undefined,
      });
      cursorPage++;
    });
  }

  for (const play of orderedPlays) {
    playStartPages.push(playStartById.get(play.id) ?? coverPages + tocPages + 1);
  }

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
  settings?: Pick<PlaybookPrintSettings, "sortBySeries" | "sortByTags" | "format">,
): PlaybookTocEntry[] {
  const bySeries = Boolean(
    settings?.sortBySeries ?? settings?.format?.sortBySeries,
  );
  const byTags = Boolean(settings?.sortByTags ?? settings?.format?.sortByTags);
  const orderedPlays = sortPlaysForPlaybookPrint(plays, {
    sortBySeries: bySeries,
    sortByTags: byTags,
  });
  const { playStartPages, firstContentPage } = pagination;
  const sectionName = playbookName || "Playbook";
  const entries: PlaybookTocEntry[] = [];
  const pageByPlayId = new Map<string, number>();
  orderedPlays.forEach((play, i) => {
    pageByPlayId.set(play.id, playStartPages[i] ?? firstContentPage);
  });

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

  if (bySeries || byTags) {
    const groups = groupPlaysForPrint(orderedPlays, bySeries, byTags);
    groups.forEach((group, groupIndex) => {
      const groupNum = groupIndex + 1;
      const groupPage =
        pageByPlayId.get(group.plays[0]?.id ?? "") ?? firstContentPage;
      entries.push({
        num: `1.1.${groupNum}`,
        label: group.label,
        page: groupPage,
        indent: 2,
        group: true,
      });
      group.plays.forEach((play, playIndex) => {
        entries.push({
          num: `1.1.${groupNum}.${playIndex + 1}`,
          label: play.title || "Untitled",
          page: pageByPlayId.get(play.id) ?? firstContentPage,
          indent: 3,
        });
      });
    });
    return entries;
  }

  orderedPlays.forEach((play, i) => {
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
