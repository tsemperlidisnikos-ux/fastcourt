export type PlaybookPaperSize = "A4" | "Letter";

export type PlaybookPrintOrientation = "landscape" | "portrait";

export type CoverVerticalAlign = "top" | "center" | "bottom";

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
  titleFontSize: number;
  titleMarginTop: number;
  subtitle: string;
  subtitleFontSize: number;
  subtitleMarginTop: number;
}

export interface PlaybookPrintConfig {
  paperSize: PlaybookPaperSize;
  orientation: PlaybookPrintOrientation;
  paddingVerticalIn: number;
  paddingHorizontalIn: number;
  scalePdf: number;
  eachPlaySeparatePage: boolean;
  showVideoPlaceholders: boolean;
  showAudioPlaceholders: boolean;
  overwriteClassicLayout: boolean;
  includeToc: boolean;
  includeNotes: boolean;
  includePageNumbers: boolean;
  fontSizes: PlaybookPrintFontSizes;
  cover: PlaybookCoverConfig;
}
