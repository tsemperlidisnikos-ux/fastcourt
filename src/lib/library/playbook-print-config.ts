import type { PlaybookPrintSettings } from "@/lib/library/playbook-print";
import { DEFAULT_PLAYBOOK_FORMAT_OPTIONS } from "@/lib/library/playbook-print-format";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";

const STORAGE_KEY = "fastcourt_playbook_print_config_v2";

/** Defaults for Print Settings + Cover Page tabs (Restore Default Settings). */
export const DEFAULT_PLAYBOOK_PRINT_CONFIG: PlaybookPrintConfig = {
  paperSize: "A4",
  orientation: "portrait",
  paddingVerticalCm: 1,
  paddingHorizontalCm: 0.89,
  scalePdf: 100,
  eachPlaySeparatePage: true,
  showVideoPlaceholders: false,
  showAudioPlaceholders: false,
  overwriteClassicLayout: false,
  includeToc: true,
  includeNotes: true,
  includePageNumbers: true,
  format: { ...DEFAULT_PLAYBOOK_FORMAT_OPTIONS },
  fontSizes: {
    playbookTitle: 30,
    chapterTitle: 14,
    elementTitle: 9,
    elementText: 8,
    playDescriptions: 11,
    phaseDescriptions: 9,
    phaseTitle: 9,
  },
  cover: {
    includeCover: true,
    verticalAlign: "top",
    addCoverImage: false,
    coverImageDataUrl: null,
    coverImageWidthPct: 100,
    teamName: "",
    teamNameFontSize: 24,
    titleFontSize: 30,
    titleMarginTop: 80,
    subtitle: "",
    subtitleFontSize: 30,
    subtitleMarginTop: 80,
  },
};

type StoredPlaybookPrintConfig = Partial<PlaybookPrintConfig> & {
  paddingVerticalIn?: number;
  paddingHorizontalIn?: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function inchesToCm(inches: number) {
  return Math.round(inches * 2.54 * 100) / 100;
}

function resolvePaddingCm(parsed: StoredPlaybookPrintConfig) {
  if (
    typeof parsed.paddingVerticalCm === "number" &&
    typeof parsed.paddingHorizontalCm === "number"
  ) {
    return {
      paddingVerticalCm: parsed.paddingVerticalCm,
      paddingHorizontalCm: parsed.paddingHorizontalCm,
    };
  }

  return {
    paddingVerticalCm: inchesToCm(parsed.paddingVerticalIn ?? 0.5),
    paddingHorizontalCm: inchesToCm(parsed.paddingHorizontalIn ?? 0.35),
  };
}

export function loadPlaybookPrintConfig(): PlaybookPrintConfig {
  if (!isBrowser()) return { ...DEFAULT_PLAYBOOK_PRINT_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYBOOK_PRINT_CONFIG };
    const parsed = JSON.parse(raw) as StoredPlaybookPrintConfig;
    const padding = resolvePaddingCm(parsed);
    return {
      ...DEFAULT_PLAYBOOK_PRINT_CONFIG,
      ...parsed,
      ...padding,
      fontSizes: {
        ...DEFAULT_PLAYBOOK_PRINT_CONFIG.fontSizes,
        ...(parsed.fontSizes ?? {}),
      },
      format: {
        ...DEFAULT_PLAYBOOK_PRINT_CONFIG.format,
        ...(parsed.format ?? {}),
      },
      cover: {
        ...DEFAULT_PLAYBOOK_PRINT_CONFIG.cover,
        ...(parsed.cover ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_PLAYBOOK_PRINT_CONFIG };
  }
}

export function savePlaybookPrintConfig(config: PlaybookPrintConfig) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function toPlaybookPrintSettings(
  config: PlaybookPrintConfig,
): PlaybookPrintSettings {
  return {
    includeCover: config.cover.includeCover,
    includeToc: config.includeToc,
    includeNotes: config.includeNotes,
    includePageNumbers: config.includePageNumbers,
    eachPlaySeparatePage: config.eachPlaySeparatePage,
    orientation: config.orientation,
    format: config.format,
    overwriteClassicLayout: config.overwriteClassicLayout,
    sortBySeries: config.format.sortBySeries,
    sortByTags: config.format.sortByTags,
  };
}

export function cmToMm(cm: number) {
  return Math.round(cm * 10 * 10) / 10;
}

export function getPaperDimensions(config: PlaybookPrintConfig) {
  const landscape = config.orientation !== "portrait";
  const isLetter = config.paperSize === "Letter";
  const baseW = isLetter ? 215.9 : 210;
  const baseH = isLetter ? 279.4 : 297;
  return {
    pageWidthMm: landscape ? baseH : baseW,
    pageHeightMm: landscape ? baseW : baseH,
    marginVerticalMm: cmToMm(config.paddingVerticalCm),
    marginHorizontalMm: cmToMm(config.paddingHorizontalCm),
    orientation: config.orientation,
    paperCss: isLetter ? "letter" : "A4",
  };
}
