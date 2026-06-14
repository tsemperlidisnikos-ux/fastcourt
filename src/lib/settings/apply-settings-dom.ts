import { setRuntimeActionColors } from "@/lib/designer/action-geometry";
import type { ActionType } from "@/types/designer";
import type { AppearanceSettings } from "@/types/appearance-settings";
import type { PdfBrandSettings } from "@/types/pdf-branding";

const LIB_COL_WIDTH_KEYS = ["season", "team", "series", "tags"] as const;
const LIB_COL_WIDTH_MIN = 40;
const LIB_COL_WIDTH_MAX = 400;

function setVar(el: HTMLElement, name: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    el.style.removeProperty(name);
    return;
  }
  el.style.setProperty(name, String(value));
}

function sanitizeLibraryColumnWidth(val: number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = Math.round(val);
  if (!Number.isFinite(n)) return null;
  return Math.min(LIB_COL_WIDTH_MAX, Math.max(LIB_COL_WIDTH_MIN, n));
}

function applyLibraryColumnWidthVar(
  el: HTMLElement,
  col: (typeof LIB_COL_WIDTH_KEYS)[number],
  val: number | null,
) {
  const propW = `--fd-lib-col-${col}-width`;
  const propMin = `--fd-lib-col-${col}-min`;
  const propMax = `--fd-lib-col-${col}-max`;
  if (val == null) {
    el.style.removeProperty(propW);
    el.style.removeProperty(propMin);
    el.style.removeProperty(propMax);
    return;
  }
  const px = `${val}px`;
  el.style.setProperty(propW, px);
  el.style.setProperty(propMin, px);
  el.style.setProperty(propMax, px);
}

function applyLibraryListSplitPct(pct: number) {
  const value = Math.min(72, Math.max(28, Math.round(pct)));
  const split = `${value}%`;
  const main = document.querySelector(
    "#screen-organizer .org-library-main, #screen-organizer .fd-library-main",
  );
  if (main instanceof HTMLElement) {
    main.style.flex = `0 0 ${split}`;
    main.style.maxWidth = split;
  }
}

const DESIGNER_SIDEBAR_FONT_MIN = 11;
const DESIGNER_SIDEBAR_FONT_MAX = 22;
const DESIGNER_TOOLS_WIDTH_MIN = 200;
const DESIGNER_TOOLS_WIDTH_MAX = 480;

function sanitizeDesignerToolsWidth(val: number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const n = Math.round(val);
  if (!Number.isFinite(n)) return null;
  return Math.min(DESIGNER_TOOLS_WIDTH_MAX, Math.max(DESIGNER_TOOLS_WIDTH_MIN, n));
}

function applyDesignerSidebarFont(el: HTMLElement, px: number) {
  const size = Math.min(
    DESIGNER_SIDEBAR_FONT_MAX,
    Math.max(DESIGNER_SIDEBAR_FONT_MIN, Math.round(px) || 15),
  );
  const scale = "var(--fd-editor-ui-scale, 1.42)";
  setVar(el, "--fd-editor-sidebar-font", `calc(${size}px * ${scale})`);
  setVar(
    el,
    "--fd-editor-sidebar-font-sm",
    `calc(${Math.max(9, Math.round(size * 0.8))}px * ${scale})`,
  );
  setVar(
    el,
    "--fd-editor-sidebar-font-xs",
    `calc(${Math.max(8, Math.round(size * 0.73))}px * ${scale})`,
  );
  setVar(
    el,
    "--fd-editor-sidebar-font-lg",
    `calc(${Math.max(12, Math.round(size * 1.12))}px * ${scale})`,
  );
}

function applyDesignerLayoutVars(
  el: HTMLElement,
  dc: AppearanceSettings["designerColumns"],
) {
  const toolsWidth = sanitizeDesignerToolsWidth(dc.tools);
  if (toolsWidth != null) setVar(el, "--fd-editor-sidebar-width", `${toolsWidth}px`);
  else el.style.removeProperty("--fd-editor-sidebar-width");

  if (dc.court) setVar(el, "--fd-editor-canvas-col", `${Math.round(dc.court)}px`);
  else el.style.removeProperty("--fd-editor-canvas-col");

  if (dc.notes) setVar(el, "--fd-editor-notes-width", `${Math.round(dc.notes)}px`);
  else el.style.removeProperty("--fd-editor-notes-width");

  if (dc.frames) setVar(el, "--fd-editor-frame-strip-width", `${Math.round(dc.frames)}px`);
  else el.style.removeProperty("--fd-editor-frame-strip-width");

  applyDesignerSidebarFont(el, dc.tableFont);
}

export function applyAppearanceToDocument(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  root.setAttribute("data-theme", settings.theme);
  root.setAttribute("data-player-display", settings.playerDisplay);
  root.setAttribute(
    "data-allow-finger-draw",
    settings.allowFingerDraw ? "1" : "0",
  );
  root.setAttribute(
    "data-high-contrast-court",
    settings.highContrastCourt ? "1" : "0",
  );

  const fontStack =
    settings.appFont === "system-ui"
      ? 'system-ui, "Segoe UI", sans-serif'
      : `"${settings.appFont}", system-ui, "Segoe UI", sans-serif`;

  setVar(root, "--fc-app-font", fontStack);
  setVar(root, "--fc-ui-font", fontStack);
  setVar(root, "--fd-red", settings.panelAccent);
  setVar(root, "--od-accent", settings.panelAccent);
  applyHeaderColorToDocument(settings.headerColor);
  applyHeaderBrandRowColorToDocument(
    settings.headerBrandRowColor || settings.headerColor,
  );
  setVar(root, "--fd-header-nav-active-color", settings.headerNavActiveColor);
  const organizer = document.getElementById("screen-organizer");
  if (organizer instanceof HTMLElement) {
    setVar(organizer, "--fd-header-nav-active-color", settings.headerNavActiveColor);
  }
  setVar(root, "--fd-utility-bar-gradient", settings.utilityBar);

  const lc = settings.libraryColumns;
  setVar(root, "--fd-lib-table-font-size", `${lc.tableFont}px`);
  setVar(root, "--fc-lib-list-split-pct", `${lc.listSplitPct}%`);
  applyLibraryListSplitPct(lc.listSplitPct);
  LIB_COL_WIDTH_KEYS.forEach((col) => {
    applyLibraryColumnWidthVar(root, col, sanitizeLibraryColumnWidth(lc[col]));
  });
  const fdUi = document.querySelector("#screen-organizer .fd-ui");
  if (fdUi instanceof HTMLElement) {
    LIB_COL_WIDTH_KEYS.forEach((col) => {
      applyLibraryColumnWidthVar(fdUi, col, sanitizeLibraryColumnWidth(lc[col]));
    });
    setVar(fdUi, "--fd-lib-table-font-size", `${lc.tableFont}px`);
  }

  setVar(root, "--fc-lib-frames-grid-cols", settings.libraryFramesGrid.columns);
  setVar(root, "--fc-lib-frames-grid-gap", `${settings.libraryFramesGrid.gap}px`);

  const dc = settings.designerColumns;
  applyDesignerLayoutVars(root, dc);
  const designer = document.getElementById("screen-designer");
  if (designer instanceof HTMLElement) {
    applyDesignerLayoutVars(designer, dc);
  }

  setRuntimeActionColors(
    settings.actionColors as Partial<Record<ActionType, string>>,
  );

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      settings.theme === "dark" ? "#0f172a" : settings.headerColor,
    );
  }
}

function applyHeaderBrandRowColorToDocument(color: string | null | undefined) {
  if (typeof document === "undefined") return;
  const brandRowColor = color?.trim();
  const targets: HTMLElement[] = [document.documentElement];
  const organizer = document.getElementById("screen-organizer");
  if (organizer instanceof HTMLElement) targets.push(organizer);

  targets.forEach((el) => {
    if (!brandRowColor) {
      el.style.removeProperty("--fd-header-brand-row-bg");
      return;
    }
    setVar(el, "--fd-header-brand-row-bg", brandRowColor);
  });
}

function applyHeaderColorToDocument(color: string | null | undefined) {
  if (typeof document === "undefined") return;
  const headerColor = color?.trim();
  const targets: HTMLElement[] = [document.documentElement];
  for (const id of ["screen-organizer", "screen-designer"] as const) {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement) targets.push(el);
  }

  targets.forEach((el) => {
    if (!headerColor) {
      el.style.removeProperty("--fd-header-dark");
      el.style.removeProperty("--fc-modern-header-from");
      el.style.removeProperty("--fc-modern-header-to");
      el.style.removeProperty("--fd-editor-app-bar");
      return;
    }
    setVar(el, "--fd-header-dark", headerColor);
    setVar(el, "--fc-modern-header-from", headerColor);
    setVar(el, "--fc-modern-header-to", headerColor);
    setVar(el, "--fd-editor-app-bar", headerColor);
  });
}

export function applyPdfBrandToDocument(brand: PdfBrandSettings) {
  if (typeof document === "undefined") return;
  applyHeaderColorToDocument(brand.headerColor);
}
