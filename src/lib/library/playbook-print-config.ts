import type { PlaybookPrintSettings } from "@/lib/library/playbook-print";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";

const STORAGE_KEY = "fastcourt_playbook_print_config_v1";

export const DEFAULT_PLAYBOOK_PRINT_CONFIG: PlaybookPrintConfig = {
  paperSize: "A4",
  orientation: "portrait",
  paddingVerticalIn: 0.5,
  paddingHorizontalIn: 0.5,
  scalePdf: 100,
  eachPlaySeparatePage: true,
  showVideoPlaceholders: false,
  showAudioPlaceholders: false,
  overwriteClassicLayout: false,
  includeToc: true,
  includeNotes: true,
  includePageNumbers: true,
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
    titleFontSize: 35,
    titleMarginTop: 20,
    subtitle: "",
    subtitleFontSize: 20,
    subtitleMarginTop: 10,
  },
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function loadPlaybookPrintConfig(): PlaybookPrintConfig {
  if (!isBrowser()) return { ...DEFAULT_PLAYBOOK_PRINT_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAYBOOK_PRINT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<PlaybookPrintConfig>;
    return {
      ...DEFAULT_PLAYBOOK_PRINT_CONFIG,
      ...parsed,
      fontSizes: {
        ...DEFAULT_PLAYBOOK_PRINT_CONFIG.fontSizes,
        ...(parsed.fontSizes ?? {}),
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
  };
}

export function inchesToMm(inches: number) {
  return Math.round(inches * 25.4 * 10) / 10;
}

export function getPaperDimensions(config: PlaybookPrintConfig) {
  const landscape = config.orientation !== "portrait";
  const isLetter = config.paperSize === "Letter";
  const baseW = isLetter ? 215.9 : 210;
  const baseH = isLetter ? 279.4 : 297;
  return {
    pageWidthMm: landscape ? baseH : baseW,
    pageHeightMm: landscape ? baseW : baseH,
    marginVerticalMm: inchesToMm(config.paddingVerticalIn),
    marginHorizontalMm: inchesToMm(config.paddingHorizontalIn),
    orientation: config.orientation,
    paperCss: isLetter ? "letter" : "A4",
  };
}
