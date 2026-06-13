"use client";

import { create } from "zustand";
import {
  applyAppearanceToDocument,
  applyPdfBrandToDocument,
} from "@/lib/settings/apply-settings-dom";
import {
  DEFAULT_APPEARANCE,
  loadAppearanceSettings,
  saveAppearanceSettings,
} from "@/lib/settings/appearance-settings";
import {
  DEFAULT_BILLING_CONFIG,
  loadBillingConfig,
  normalizeBillingConfig,
  saveBillingConfig,
} from "@/lib/settings/billing-config";
import {
  DEFAULT_PDF_BRAND,
  loadPdfBrandSettings,
  savePdfBrandSettings,
} from "@/lib/settings/pdf-branding";
import {
  loadAppLogoDataUrl,
  saveAppLogoDataUrl,
} from "@/lib/settings/app-logo";
import type {
  AppearanceSettings,
  AppTheme,
  PlayerDisplayMode,
} from "@/types/appearance-settings";
import type { BillingConfig } from "@/types/billing-config";
import type { PdfBrandSettings } from "@/types/pdf-branding";

interface SettingsState {
  hydrated: boolean;
  appearance: AppearanceSettings;
  pdfBrand: PdfBrandSettings;
  appLogoDataUrl: string | null;
  billing: BillingConfig;
  hydrate: () => void;
  setAppearance: (next: AppearanceSettings, persist?: boolean) => void;
  setPdfBrand: (next: PdfBrandSettings, persist?: boolean) => boolean;
  setAppLogo: (dataUrl: string | null, persist?: boolean) => boolean;
  setBilling: (next: BillingConfig, persist?: boolean) => void;
  applyAll: () => void;
  persistAll: () => void;
}

function migrateLegacyAppearance(): AppearanceSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("orgSettings_v1");
    if (!raw) return null;
    const legacy = JSON.parse(raw) as Record<string, unknown>;
    const base = loadAppearanceSettings();
    return {
      ...base,
      panelAccent: String(legacy.designerAccent ?? base.panelAccent),
      utilityBar: String(legacy.utilityBarColor ?? base.utilityBar),
      actionColors: {
        ...base.actionColors,
        ...(legacy.actionColors as AppearanceSettings["actionColors"]),
      },
      appFont: String(legacy.appFontFamily ?? base.appFont),
      libraryColumns: {
        ...base.libraryColumns,
        ...(legacy.libraryColumnWidths as object),
        tableFont: Number(legacy.libraryTableFontSize ?? base.libraryColumns.tableFont),
        listSplitPct: Number(legacy.libraryListSplitPct ?? base.libraryColumns.listSplitPct),
      },
      libraryFramesGrid: {
        ...base.libraryFramesGrid,
        ...(legacy.libraryFramesGrid as object),
      },
      designerColumns: {
        ...base.designerColumns,
        ...(legacy.designerColumnWidths as object),
      },
    };
  } catch {
    return null;
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: false,
  appearance: DEFAULT_APPEARANCE,
  pdfBrand: DEFAULT_PDF_BRAND,
  appLogoDataUrl: null,
  billing: DEFAULT_BILLING_CONFIG,

  hydrate: () => {
    const migrated = migrateLegacyAppearance();
    const appearanceRaw = migrated ?? loadAppearanceSettings();
    const pdfBrandRaw = loadPdfBrandSettings();
    const headerColor = pdfBrandRaw.headerColor || appearanceRaw.headerColor;
    const appearance = { ...appearanceRaw, headerColor };
    const pdfBrand = { ...pdfBrandRaw, headerColor };
    const appLogoDataUrl = loadAppLogoDataUrl();
    const billing = normalizeBillingConfig(loadBillingConfig());
    set({ appearance, pdfBrand, appLogoDataUrl, billing, hydrated: true });
    applyAppearanceToDocument(appearance);
    applyPdfBrandToDocument(pdfBrand);

    const theme = localStorage.getItem("fastcourt_theme") as AppTheme | null;
    if (theme === "light" || theme === "dark") {
      const next: AppearanceSettings = { ...appearance, theme };
      set({ appearance: next });
      applyAppearanceToDocument(next);
    }
    const playerDisplay = localStorage.getItem(
      "fastcourt_player_display",
    ) as PlayerDisplayMode | null;
    if (playerDisplay === "number" || playerDisplay === "circle") {
      const next: AppearanceSettings = { ...get().appearance, playerDisplay };
      set({ appearance: next });
      applyAppearanceToDocument(next);
    }
  },

  setAppearance: (next, persist = false) => {
    const { pdfBrand } = get();
    const syncedPdfBrand =
      pdfBrand.headerColor !== next.headerColor
        ? { ...pdfBrand, headerColor: next.headerColor }
        : pdfBrand;
    set({ appearance: next, pdfBrand: syncedPdfBrand });
    applyAppearanceToDocument(next);
    if (persist) saveAppearanceSettings(next);
    localStorage.setItem("fastcourt_theme", next.theme);
    localStorage.setItem("fastcourt_player_display", next.playerDisplay);
  },

  setPdfBrand: (next, persist = false) => {
    const { appearance } = get();
    const syncedAppearance =
      appearance.headerColor !== next.headerColor
        ? { ...appearance, headerColor: next.headerColor }
        : appearance;
    set({ pdfBrand: next, appearance: syncedAppearance });
    applyPdfBrandToDocument(next);
    if (persist) return savePdfBrandSettings(next);
    return true;
  },

  setAppLogo: (dataUrl, persist = false) => {
    const next = dataUrl?.trim() ? dataUrl : null;
    set({ appLogoDataUrl: next });
    if (persist) return saveAppLogoDataUrl(next);
    return true;
  },

  setBilling: (next, persist = false) => {
    set({ billing: next });
    if (persist) saveBillingConfig(next);
  },

  applyAll: () => {
    const { appearance, pdfBrand } = get();
    applyAppearanceToDocument(appearance);
    applyPdfBrandToDocument(pdfBrand);
  },

  persistAll: () => {
    const { appearance, pdfBrand, billing } = get();
    saveAppearanceSettings(appearance);
    savePdfBrandSettings(pdfBrand);
    saveBillingConfig(billing);
    localStorage.setItem("fastcourt_theme", appearance.theme);
    localStorage.setItem("fastcourt_player_display", appearance.playerDisplay);
  },
}));
