"use client";

import { create } from "zustand";
import {
  applyAppearanceToDocument,
  applyPdfBrandToDocument,
} from "@/lib/settings/apply-settings-dom";
import {
  DEFAULT_APPEARANCE,
  loadAppearanceSettings,
  normalizeAppFont,
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
  APP_LOGO_CHANGED_EVENT,
  loadAppLogoDataUrl,
  saveAppLogoDataUrl,
} from "@/lib/settings/app-logo";
import {
  buildSettingsBundle,
  loadSettingsForUser,
  persistSettingsForUser,
} from "@/lib/settings/user-settings-sync";
import {
  loadPracticeLivePrefs,
  savePracticeLivePrefs,
  type PracticeLivePrefs,
} from "@/lib/practice/live-prefs";
import type {
  AppearanceSettings,
  AppTheme,
} from "@/types/appearance-settings";
import type { BillingConfig } from "@/types/billing-config";
import type { PdfBrandSettings } from "@/types/pdf-branding";
import type { SessionUser } from "@/types/auth";
import {
  DEFAULT_DESIGNER_PREFS,
  DEFAULT_NOTIFICATION_PREFS,
  type DesignerUserPrefs,
  type NotificationPrefs,
} from "@/types/user-settings";
import { loadScopedUserSettings } from "@/lib/settings/user-settings-storage";
import { useAuthStore } from "@/stores/auth-store";

interface SettingsState {
  hydrated: boolean;
  scopedUserId: string | null;
  appearance: AppearanceSettings;
  pdfBrand: PdfBrandSettings;
  appLogoDataUrl: string | null;
  billing: BillingConfig;
  practiceLive: PracticeLivePrefs;
  designer: DesignerUserPrefs;
  notifications: NotificationPrefs;
  useOrgBranding: boolean;
  cloudSyncedAt: string | null;
  hydrate: () => void;
  hydrateForUser: (user: SessionUser) => Promise<void>;
  setAppearance: (next: AppearanceSettings, persist?: boolean) => void;
  setPdfBrand: (next: PdfBrandSettings, persist?: boolean) => boolean;
  setAppLogo: (dataUrl: string | null, persist?: boolean) => boolean;
  setBilling: (next: BillingConfig, persist?: boolean) => void;
  setNotifications: (next: NotificationPrefs, persist?: boolean) => void;
  setUseOrgBranding: (next: boolean, persist?: boolean) => void;
  applyAll: () => void;
  persistAll: (user?: SessionUser | null) => Promise<void>;
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
      headerNavActiveColor: String(
        legacy.designerAccent ?? base.headerNavActiveColor,
      ),
      actionColors: {
        ...base.actionColors,
        ...(legacy.actionColors as AppearanceSettings["actionColors"]),
      },
      appFont: normalizeAppFont(String(legacy.appFontFamily ?? base.appFont)),
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

function applyLegacyThemeOverrides(appearance: AppearanceSettings): AppearanceSettings {
  if (typeof window === "undefined") return appearance;
  let next = appearance;
  const theme = localStorage.getItem("fastcourt_theme") as AppTheme | null;
  if (theme === "light" || theme === "dark") {
    next = { ...next, theme };
  }
  return { ...next, playerDisplay: "number" };
}

function baseHydrate(): Pick<
  SettingsState,
  "appearance" | "pdfBrand" | "appLogoDataUrl" | "billing" | "practiceLive" | "designer" | "notifications"
> {
  const migrated = migrateLegacyAppearance();
  const appearanceRaw = migrated ?? loadAppearanceSettings();
  const pdfBrandRaw = loadPdfBrandSettings();
  const headerColor = pdfBrandRaw.headerColor || appearanceRaw.headerColor;
  const appearance = applyLegacyThemeOverrides({ ...appearanceRaw, headerColor });
  const pdfBrand = { ...pdfBrandRaw, headerColor };
  return {
    appearance,
    pdfBrand,
    appLogoDataUrl: loadAppLogoDataUrl(),
    billing: normalizeBillingConfig(loadBillingConfig()),
    practiceLive: loadPracticeLivePrefs(),
    designer: { ...DEFAULT_DESIGNER_PREFS },
    notifications: { ...DEFAULT_NOTIFICATION_PREFS },
  };
}

function initialClientState(): Pick<
  SettingsState,
  | "hydrated"
  | "appearance"
  | "pdfBrand"
  | "appLogoDataUrl"
  | "billing"
  | "practiceLive"
  | "designer"
  | "notifications"
> {
  if (typeof window === "undefined") {
    return {
      hydrated: false,
      appearance: DEFAULT_APPEARANCE,
      pdfBrand: DEFAULT_PDF_BRAND,
      appLogoDataUrl: null,
      billing: DEFAULT_BILLING_CONFIG,
      practiceLive: loadPracticeLivePrefs(),
      designer: { ...DEFAULT_DESIGNER_PREFS },
      notifications: { ...DEFAULT_NOTIFICATION_PREFS },
    };
  }

  const base = baseHydrate();
  return {
    hydrated: true,
    ...base,
  };
}

const initialState = initialClientState();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hydrated: initialState.hydrated,
  scopedUserId: null,
  appearance: initialState.appearance,
  pdfBrand: initialState.pdfBrand,
  appLogoDataUrl: initialState.appLogoDataUrl,
  billing: initialState.billing,
  practiceLive: initialState.practiceLive,
  designer: initialState.designer,
  notifications: initialState.notifications,
  useOrgBranding: true,
  cloudSyncedAt: null,

  hydrate: () => {
    const base = baseHydrate();
    set({ ...base, hydrated: true, scopedUserId: null });
    applyAppearanceToDocument(base.appearance);
    applyPdfBrandToDocument(base.pdfBrand);
  },

  hydrateForUser: async (user) => {
    const resolved = await loadSettingsForUser(user);
    set({
      ...resolved,
      appLogoDataUrl: loadAppLogoDataUrl(),
      billing: normalizeBillingConfig(loadBillingConfig()),
      hydrated: true,
      scopedUserId: user.id,
    });
    applyAppearanceToDocument(resolved.appearance);
    applyPdfBrandToDocument(resolved.pdfBrand);
    savePracticeLivePrefs(resolved.practiceLive);
  },

  setAppearance: (next, persist = false) => {
    const normalized = { ...next, playerDisplay: "number" as const };
    const { pdfBrand, scopedUserId } = get();
    const syncedPdfBrand =
      pdfBrand.headerColor !== normalized.headerColor
        ? { ...pdfBrand, headerColor: normalized.headerColor }
        : pdfBrand;
    set({ appearance: normalized, pdfBrand: syncedPdfBrand });
    applyAppearanceToDocument(normalized);
    if (persist) saveAppearanceSettings(normalized);
    localStorage.setItem("fastcourt_theme", normalized.theme);
    if (persist && scopedUserId) {
      void get().persistAll();
    }
  },

  setPdfBrand: (next, persist = false) => {
    const { appearance, scopedUserId } = get();
    const syncedAppearance =
      appearance.headerColor !== next.headerColor
        ? { ...appearance, headerColor: next.headerColor }
        : appearance;
    set({ pdfBrand: next, appearance: syncedAppearance });
    applyPdfBrandToDocument(next);
    if (persist) {
      const ok = savePdfBrandSettings(next);
      if (ok && scopedUserId) void get().persistAll();
      return ok;
    }
    return true;
  },

  setAppLogo: (dataUrl, persist = false) => {
    const next = dataUrl?.trim() ? dataUrl : null;
    set({ appLogoDataUrl: next });
    if (persist) {
      const saved = saveAppLogoDataUrl(next);
      if (saved && typeof window !== "undefined") {
        window.dispatchEvent(new Event(APP_LOGO_CHANGED_EVENT));
      }
      return saved;
    }
    return true;
  },

  setBilling: (next, persist = false) => {
    set({ billing: next });
    if (persist) saveBillingConfig(next);
  },

  setNotifications: (next, persist = false) => {
    set({ notifications: next });
    if (persist && get().scopedUserId) void get().persistAll();
  },

  setUseOrgBranding: (next, persist = false) => {
    set({ useOrgBranding: next });
    if (persist && get().scopedUserId) void get().persistAll();
  },

  applyAll: () => {
    const { appearance, pdfBrand } = get();
    applyAppearanceToDocument(appearance);
    applyPdfBrandToDocument(pdfBrand);
  },

  persistAll: async (user) => {
    const state = get();
    const {
      appearance,
      pdfBrand,
      billing,
      practiceLive,
      designer,
      notifications,
      useOrgBranding,
      scopedUserId,
      cloudSyncedAt,
    } = state;

    saveAppearanceSettings(appearance);
    savePdfBrandSettings(pdfBrand);
    saveBillingConfig(billing);
    savePracticeLivePrefs(practiceLive);
    localStorage.setItem("fastcourt_theme", appearance.theme);

    const sessionUser = user ?? useAuthStore.getState().session?.user ?? null;
    if (!sessionUser?.id) return;
    if (scopedUserId && sessionUser.id !== scopedUserId) return;

    const scoped = loadScopedUserSettings(sessionUser.id);
    const pdfBrandForBundle =
      useOrgBranding && scoped.pdfBrand
        ? { ...DEFAULT_PDF_BRAND, ...scoped.pdfBrand }
        : pdfBrand;

    const bundle = buildSettingsBundle({
      appearance,
      pdfBrand: pdfBrandForBundle,
      practiceLive,
      designer,
      notifications,
      useOrgBranding,
      devices: scoped.devices,
      cloudSyncedAt,
    });

    const result = await persistSettingsForUser(sessionUser, bundle);

    if (result.ok) {
      set({ cloudSyncedAt: bundle.cloudSyncedAt ?? new Date().toISOString() });
    }
  },
}));
