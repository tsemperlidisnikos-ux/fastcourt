export type PlaybookPaperSize = "A4" | "Letter";

export type PlaybookPrintOrientation = "landscape" | "portrait";

export type CoverVerticalAlign = "top" | "center" | "bottom";

/** Source for a printable text field (page header, play header, etc.). */
export type PlaybookPrintFieldSource =
  | "none"
  | "playbookTitle"
  | "playName"
  | "team"
  | "series";

export type PlaybookPageNumberPosition =
  | "none"
  | "footerLeft"
  | "footerCenter"
  | "footerRight"
  | "headerLeft"
  | "headerRight";

export type PlaybookGridCount = 1 | 2 | 3 | 4 | 5 | 6;

export interface PlaybookFormatOptions {
  pageTitle: PlaybookPrintFieldSource;
  pageSubtitle: PlaybookPrintFieldSource;
  pageNumberPosition: PlaybookPageNumberPosition;
  framesPerRow: PlaybookGridCount;
  rowsPerPage: PlaybookGridCount;
  playTitle: PlaybookPrintFieldSource;
  playSubtitle: PlaybookPrintFieldSource;
  eachPlayNewLine: boolean;
}

export interface PlaybookPrintFontSizes {
  playbookTitle: number;
  chapterTitle: number;
  elementTitle: number;
  elementText: number;
  playDescriptions: number;
  phaseDescriptions: number;
  phaseTitle: number;
}

export interface PlaybookCoverConfig {
  includeCover: boolean;
  verticalAlign: CoverVerticalAlign;
  addCoverImage: boolean;
  coverImageDataUrl: string | null;
  coverImageWidthPct: number;
  teamName: string;
  teamNameFontSize: number;
  titleFontSize: number;
  titleMarginTop: number;
  subtitle: string;
  subtitleFontSize: number;
  subtitleMarginTop: number;
}

export interface PlaybookPrintConfig {
  paperSize: PlaybookPaperSize;
  orientation: PlaybookPrintOrientation;
  paddingVerticalCm: number;
  paddingHorizontalCm: number;
  scalePdf: number;
  eachPlaySeparatePage: boolean;
  showVideoPlaceholders: boolean;
  showAudioPlaceholders: boolean;
  overwriteClassicLayout: boolean;
  includeToc: boolean;
  includeNotes: boolean;
  includePageNumbers: boolean;
  format: PlaybookFormatOptions;
  fontSizes: PlaybookPrintFontSizes;
  cover: PlaybookCoverConfig;
}
