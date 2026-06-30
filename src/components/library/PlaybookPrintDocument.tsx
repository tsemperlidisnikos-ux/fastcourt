"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { resolvePlayCourtAppearance } from "@/lib/designer/court-view-settings";
import { loadCourtWoodTexture } from "@/lib/designer/court-wood-texture-cache";
import {
  resolvePdfCoverSubtitle,
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getPaperDimensions,
  toPlaybookPrintSettings,
} from "@/lib/library/playbook-print-config";
import {
  resolvePlaybookPrintField,
  shouldShowPlaybookPageNumbers,
} from "@/lib/library/playbook-print-format";
import {
  buildPlaybookTocEntries,
  buildPlaybookPageList,
  computePlaybookPagination,
  DEFAULT_PLAYBOOK_PRINT_SETTINGS,
  FASTDRAW_TOC_ENTRIES_PER_PAGE,
  getPlaybookChunkGrid,
  stripNotesForPrint,
  type PlaybookFrameItem,
  type PlaybookPrintSettings,
} from "@/lib/library/playbook-print";
import type {
  PlaybookPageNumberPosition,
  PlaybookPrintConfig,
} from "@/types/playbook-print-config";
import type { CourtViewSettings } from "@/types/designer";
import type { StoredPlay } from "@/types/library";

interface Props {
  playbookName: string;
  team?: string;
  subtitle?: string;
  plays: StoredPlay[];
  printConfig?: PlaybookPrintConfig;
  settings?: Partial<PlaybookPrintSettings>;
  scrollToPlayId?: string | null;
  /** When set, only this page index (0-based flat list) is rendered. */
  singlePageIndex?: number | null;
  /** Miniature rendering for page thumbnails. */
  thumbnail?: boolean;
}

function DocHeader({
  left,
  right,
  logoSrc,
  pageNum,
  totalPages,
  pageNumberPosition,
  showPageNumbers,
}: {
  left: string;
  right?: string;
  logoSrc?: string;
  pageNum?: number;
  totalPages?: number;
  pageNumberPosition?: PlaybookPageNumberPosition;
  showPageNumbers?: boolean;
}) {
  const pageLabel =
    showPageNumbers &&
    pageNum != null &&
    totalPages != null &&
    pageNumberPosition?.startsWith("header")
      ? `${pageNum} / ${totalPages}`
      : "";

  const leftText =
    pageNumberPosition === "headerLeft" && pageLabel ? pageLabel : left;
  const rightText =
    pageNumberPosition === "headerRight" && pageLabel
      ? pageLabel
      : (right ?? "");

  return (
    <div className="fd-head">
      <span className="fd-head-left">{leftText}</span>
      <span className="fd-head-center">
        {logoSrc ? (
          <img src={logoSrc} className="fd-head-logo" alt="" />
        ) : null}
      </span>
      <span className="fd-head-right">{rightText}</span>
    </div>
  );
}

function PageFooter({
  pageNum,
  totalPages,
  showPageNumbers,
  footerText,
  pageNumberPosition = "footerCenter",
}: {
  pageNum: number;
  totalPages: number;
  showPageNumbers: boolean;
  footerText?: string;
  pageNumberPosition?: PlaybookPageNumberPosition;
}) {
  const footer = footerText?.trim() ?? "";
  const pageLabel = showPageNumbers ? `${pageNum} / ${totalPages}` : "";

  const left =
    pageNumberPosition === "footerLeft" && pageLabel
      ? pageLabel
      : footer;
  const center =
    pageNumberPosition === "footerCenter" && pageLabel ? pageLabel : "";
  const right =
    pageNumberPosition === "footerRight" && pageLabel ? pageLabel : "";

  if (!left && !center && !right) {
    return (
      <div className="fd-foot">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className="fd-foot">
      <span className="fd-foot-brand">{left}</span>
      <span className="fd-foot-page">{center}</span>
      <span className="fd-foot-right">{right}</span>
    </div>
  );
}

function FrameCell({
  item,
  courtView,
  includeNotes,
}: {
  item: PlaybookFrameItem;
  courtView?: CourtViewSettings | null;
  includeNotes: boolean;
}) {
  const notesText = stripNotesForPrint(item.notes);
  const frameTitle =
    item.frameName?.trim() && item.frameName !== `Frame ${item.frameNum}`
      ? item.frameName
      : `Frame ${item.frameNum || 1}`;

  return (
    <div className="fd-cell">
      <div className="fd-cell-stack">
        <div className="fd-cell-frame-title">{frameTitle}</div>
        <div className="fd-cell-court">
          <CourtFrameThumbnail
            courtType={item.courtType}
            frame={item.frame}
            size="print"
            alt={item.frameName}
            courtView={courtView}
          />
        </div>
        {includeNotes && notesText ? (
          <div className="fd-cell-notes fc-frame-notes-bounded">{notesText}</div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyCell({ includeNotes }: { includeNotes: boolean }) {
  return (
    <div className="fd-cell fd-cell-empty" aria-hidden>
      <div className="fd-cell-stack">
        <div className="fd-cell-frame-title fd-cell-title-spacer" aria-hidden />
        <div className="fd-cell-court" />
        {includeNotes ? (
          <div className="fd-cell-notes fd-cell-notes-empty" aria-hidden />
        ) : null}
      </div>
    </div>
  );
}

export function PlaybookPrintDocument({
  playbookName,
  team,
  subtitle,
  plays,
  printConfig,
  settings: settingsProp,
  scrollToPlayId,
  singlePageIndex = null,
  thumbnail = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const appearance = useSettingsStore((s) => s.appearance);
  const teamLogo = pdfBrand.logoDataUrl?.trim() ?? "";
  const settings = useMemo(
    () => ({
      ...DEFAULT_PLAYBOOK_PRINT_SETTINGS,
      ...(printConfig ? toPlaybookPrintSettings(printConfig) : {}),
      ...settingsProp,
    }),
    [printConfig, settingsProp],
  );

  useEffect(() => {
    const textureIds = new Set<string>();
    for (const play of plays) {
      const courtAppearance = resolvePlayCourtAppearance(
        play.courtView,
        appearance,
      );
      if (courtAppearance.showWoodTiles && courtAppearance.woodTextureId) {
        textureIds.add(courtAppearance.woodTextureId);
      }
    }
    for (const textureId of textureIds) {
      void loadCourtWoodTexture(textureId).catch(() => {
        /* CourtFrameThumbnail falls back to procedural planks */
      });
    }
  }, [plays, appearance]);

  const cover = printConfig?.cover;
  const safeTitle = (playbookName || "Playbook").toUpperCase();
  const coverTeamName = cover?.teamName?.trim()
    ? cover.teamName.trim()
    : resolvePdfCoverTeam(pdfBrand, team);
  const displayTeam = resolvePdfCoverTeam(pdfBrand, team);
  const coverSubtitle = resolvePdfCoverSubtitle(
    pdfBrand,
    cover?.subtitle,
    subtitle,
  );
  const footerText = resolvePdfFooterText(pdfBrand);

  const pageDims = printConfig ? getPaperDimensions(printConfig) : null;
  const scaleWrapStyle = useMemo(() => {
    const scale = printConfig?.scalePdf ?? 100;
    const factor = scale / 100;
    if (scale === 100) return undefined;
    return {
      "--fc-playbook-print-scale": String(factor),
      transform: `scale(${factor})`,
      transformOrigin: "top center",
    } as CSSProperties;
  }, [printConfig?.scalePdf]);

  const printPageCss = useMemo(() => {
    if (!pageDims) return "";
    return `@page {
  size: ${pageDims.paperCss} ${pageDims.orientation};
  margin: 0;
}`;
  }, [pageDims]);

  const rootStyle = useMemo(() => {
    const style: Record<string, string | number> = {};
    if (pageDims) {
      style["--fd-page-w"] = `${pageDims.pageWidthMm}mm`;
      style["--fd-page-h"] = `${pageDims.pageHeightMm}mm`;
      style["--fd-margin"] = `${pageDims.marginVerticalMm}mm ${pageDims.marginHorizontalMm}mm`;
    }
    if (printConfig) {
      const fs = printConfig.fontSizes;
      style["--fd-print-font-playbook-title"] = `${fs.playbookTitle}px`;
      style["--fd-print-font-chapter-title"] = `${fs.chapterTitle}px`;
      style["--fd-print-font-element-title"] = `${fs.elementTitle}px`;
      style["--fd-print-font-element-text"] = `${fs.elementText}px`;
      style["--fd-print-font-play-desc"] = `${fs.playDescriptions}px`;
      style["--fd-print-font-phase-desc"] = `${fs.phaseDescriptions}px`;
      style["--fd-print-font-phase-title"] = `${fs.phaseTitle}px`;
    }
    if (cover) {
      style["--fd-cover-team-name-size"] = `${cover.teamNameFontSize}px`;
      style["--fd-cover-title-size"] = `${cover.titleFontSize}px`;
      style["--fd-cover-title-margin-top"] = `${cover.titleMarginTop}px`;
      style["--fd-cover-subtitle-size"] = `${cover.subtitleFontSize}px`;
      style["--fd-cover-subtitle-margin-top"] = `${cover.subtitleMarginTop}px`;
    }
    return style as CSSProperties;
  }, [pageDims, printConfig, cover]);

  const pagination = useMemo(
    () => computePlaybookPagination(plays, settings),
    [plays, settings],
  );

  const pageList = useMemo(
    () => buildPlaybookPageList(plays, settings).pages,
    [plays, settings],
  );

  const activePage =
    singlePageIndex != null ? (pageList[singlePageIndex] ?? null) : null;
  const isSinglePageMode = activePage != null;

  const shouldShowCover =
    settings.includeCover !== false &&
    (!isSinglePageMode || activePage?.kind === "cover");

  const shouldShowToc = (tocIndex: number) =>
    settings.includeToc !== false &&
    plays.length > 0 &&
    (!isSinglePageMode ||
      (activePage?.kind === "toc" && activePage.tocPageIndex === tocIndex));

  const shouldShowContentSheet = (sheetIndex: number) =>
    !isSinglePageMode || activePage?.contentSheetIndex === sheetIndex;

  const tocEntries = useMemo(
    () => buildPlaybookTocEntries(plays, pagination, playbookName),
    [plays, pagination, playbookName],
  );

  useEffect(() => {
    if (!scrollToPlayId || !rootRef.current) return;
    const target =
      rootRef.current.querySelector<HTMLElement>(
        `#fc-play-${CSS.escape(scrollToPlayId)}`,
      ) ??
      rootRef.current.querySelector<HTMLElement>(
        `[data-fc-play-id="${CSS.escape(scrollToPlayId)}"]`,
      );
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollToPlayId, plays]);

  const { totalPages, coverPages, tocPages } = pagination;
  const format = printConfig?.format;
  const pageNumberPosition = format?.pageNumberPosition ?? "footerCenter";
  const showPageNumbers = shouldShowPlaybookPageNumbers(
    settings.includePageNumbers !== false,
    pageNumberPosition,
  );
  const showFooterPageNumbers =
    showPageNumbers && pageNumberPosition.startsWith("footer");
  const showHeaderPageNumbers =
    showPageNumbers && pageNumberPosition.startsWith("header");

  const fieldCtxBase = useMemo(
    () => ({
      playbookName,
      displayTeam,
    }),
    [playbookName, displayTeam],
  );

  function resolvePageHeader(play?: StoredPlay) {
    const ctx = { ...fieldCtxBase, play };
    const left = resolvePlaybookPrintField(
      format?.pageTitle ?? "playbookTitle",
      ctx,
    ).toUpperCase();
    const right = resolvePlaybookPrintField(
      format?.pageSubtitle ?? "playName",
      ctx,
    );
    const playHeaderLeft = resolvePlaybookPrintField(
      format?.playTitle ?? "playName",
      ctx,
    );
    const playHeaderRight = resolvePlaybookPrintField(
      format?.playSubtitle ?? "team",
      ctx,
    );
    return { left, right, playHeaderLeft, playHeaderRight };
  }

  const playSheetSeparateFlags = useMemo(() => {
    const playHeaderOrders = new Map<number, number>();
    let playHeaderCount = 0;
    pagination.contentSheets.forEach((sheet, index) => {
      if (sheet.type !== "section" && sheet.playHeader) {
        playHeaderOrders.set(index, playHeaderCount);
        playHeaderCount += 1;
      }
    });

    return pagination.contentSheets.map((sheet, index) => {
      if (sheet.type === "section" || !sheet.playHeader) return false;
      const order = playHeaderOrders.get(index) ?? 0;
      return settings.eachPlaySeparatePage !== false && order > 0;
    });
  }, [pagination.contentSheets, settings.eachPlaySeparatePage]);

  const pageIndexByContentSheet = useMemo(() => {
    const map = new Map<number, number>();
    for (const page of pageList) {
      if (page.contentSheetIndex != null) {
        map.set(page.contentSheetIndex, page.index);
      }
    }
    return map;
  }, [pageList]);

  const coverPageIndex = pageList.find((page) => page.kind === "cover")?.index;

  function tocPageIndex(tocIndex: number) {
    return pageList.find(
      (page) => page.kind === "toc" && page.tocPageIndex === tocIndex,
    )?.index;
  }

  return (
    <div
      className={`fc-playbook-print-scale-outer${thumbnail ? " is-thumbnail" : ""}`}
      style={scaleWrapStyle}
    >
      {printPageCss ? (
        <style
          data-fc-playbook-print-page
          dangerouslySetInnerHTML={{ __html: printPageCss }}
        />
      ) : null}
      <div
        className={`fc-playbook-print-root${thumbnail ? " is-thumbnail" : ""}${isSinglePageMode ? " is-single-page" : ""}`}
        ref={rootRef}
        style={rootStyle}
        data-print-orientation={pageDims?.orientation ?? "portrait"}
        data-print-paper={pageDims?.paperCss ?? "A4"}
      >
      {shouldShowCover ? (
        <div
          className="fd-sheet fd-cover-sheet fd-cover-v2 page-break"
          data-fc-page-index={coverPageIndex}
        >
          {coverTeamName || coverSubtitle || teamLogo ? (
            <div className="fd-cover-branding">
              {teamLogo ? (
                <div className="fd-cover-top">
                  <img
                    src={teamLogo}
                    alt=""
                    className="fd-cover-team-logo"
                  />
                </div>
              ) : null}
              <div className="fd-cover-brand-text">
                {coverTeamName ? (
                  <div className="fd-cover-club-name">{coverTeamName}</div>
                ) : null}
                {coverSubtitle ? (
                  <div className="fd-cover-season">{coverSubtitle}</div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div
            className={`fd-cover-grow align-${cover?.verticalAlign ?? "top"}`}
          >
            {cover?.addCoverImage && cover.coverImageDataUrl ? (
              <div className="fd-cover-middle">
                <img
                  src={cover.coverImageDataUrl}
                  alt=""
                  className="fd-cover-center-image"
                  style={{ width: `${cover.coverImageWidthPct}%` }}
                />
              </div>
            ) : null}
            <div className="fd-cover-text">
              <div className="fd-cover-title-print">{safeTitle}</div>
            </div>
          </div>
          <PageFooter
            pageNum={1}
            totalPages={totalPages}
            showPageNumbers={showFooterPageNumbers}
            footerText={footerText}
            pageNumberPosition={pageNumberPosition}
          />
        </div>
      ) : null}

      {settings.includeToc !== false && plays.length > 0
        ? Array.from({ length: tocPages }, (_, p) => {
            if (!shouldShowToc(p)) return null;
            const slice = tocEntries.slice(
              p * FASTDRAW_TOC_ENTRIES_PER_PAGE,
              (p + 1) * FASTDRAW_TOC_ENTRIES_PER_PAGE,
            );
            const pageNum = coverPages + p + 1;
            const contSuffix = p === 0 ? "" : "Contents (cont.)";
            const tocHeader = resolvePageHeader();
            return (
              <div
                key={`toc-${p}`}
                className="fd-sheet fd-toc-sheet page-break"
                data-fc-page-index={tocPageIndex(p)}
              >
                <DocHeader
                  left={tocHeader.left}
                  right={p === 0 ? tocHeader.right : contSuffix || tocHeader.right}
                  logoSrc={teamLogo || undefined}
                  pageNum={pageNum}
                  totalPages={totalPages}
                  pageNumberPosition={pageNumberPosition}
                  showPageNumbers={showHeaderPageNumbers}
                />
                {p === 0 ? (
                  <div className="fd-toc-title">Table of Contents</div>
                ) : null}
                <div className="fd-toc-body">
                  {slice.map((entry) => (
                    <div
                      key={`${entry.num}-${entry.label}`}
                      className={`fd-toc-row fd-toc-indent-${entry.indent}${entry.group ? " fd-toc-group-row" : ""}`}
                    >
                      <span className="fd-toc-label">
                        <span className="fd-toc-num">{entry.num}</span>{" "}
                        {entry.label}
                      </span>
                      <span className="fd-toc-leader" />
                      <span className="fd-toc-page">{entry.page}</span>
                    </div>
                  ))}
                </div>
                <PageFooter
                  pageNum={pageNum}
                  totalPages={totalPages}
                  showPageNumbers={showFooterPageNumbers}
                  footerText={footerText}
                  pageNumberPosition={pageNumberPosition}
                />
              </div>
            );
          })
        : null}

      {pagination.contentSheets.map((sheet, i) => {
        if (!shouldShowContentSheet(i)) return null;
        const pageNum = coverPages + tocPages + i + 1;
        if (sheet.type === "section") {
          const countLabel = `${sheet.count || 0} play${sheet.count === 1 ? "" : "s"}`;
          const sectionHeader = resolvePageHeader();
          return (
            <div
              key={`section-${sheet.label}-${i}`}
              className="fd-sheet fd-section-sheet page-break"
              data-fc-page-index={pageIndexByContentSheet.get(i)}
            >
              <DocHeader
                left={sectionHeader.left}
                right={sheet.label || sectionHeader.right || "Section"}
                logoSrc={teamLogo || undefined}
                pageNum={pageNum}
                totalPages={totalPages}
                pageNumberPosition={pageNumberPosition}
                showPageNumbers={showHeaderPageNumbers}
              />
              <div className="fd-section-body">
                <div className="fd-section-eyebrow">Playbook Section</div>
                <h1 className="fd-section-title">{sheet.label || "Section"}</h1>
                <div className="fd-section-count">{countLabel}</div>
              </div>
              <PageFooter
                pageNum={pageNum}
                totalPages={totalPages}
                showPageNumbers={showFooterPageNumbers}
                footerText={footerText}
                pageNumberPosition={pageNumberPosition}
              />
            </div>
          );
        }

        const chunk = sheet.items;
        const chunkGrid = getPlaybookChunkGrid(chunk.length, format);
        const pad = chunkGrid.padCount;
        const playHeaders = resolvePageHeader(sheet.play);
        const headerLeft = playHeaders.playHeaderLeft || playHeaders.left;
        const headerRightBase = playHeaders.playHeaderRight || playHeaders.right;
        const headerRight = sheet.playContinued
          ? `${headerLeft || sheet.play.title || ""} (cont.)`.trim()
          : headerRightBase;

        const separatePlay = playSheetSeparateFlags[i] ?? false;
        const gridStyle =
          chunkGrid.gridClass === "fd-grid-custom"
            ? ({
                "--fd-grid-cols": chunkGrid.cols,
                "--fd-grid-rows": chunkGrid.rows,
              } as CSSProperties)
            : undefined;

        return (
          <div
            key={`grid-${sheet.play.id}-${i}`}
            className={`fd-sheet fd-content-sheet page-break${separatePlay ? " fd-play-separate-page" : ""}`}
            data-fc-page-index={pageIndexByContentSheet.get(i)}
          >
            <DocHeader
              left={(headerLeft || safeTitle).toUpperCase()}
              right={headerRight}
              logoSrc={teamLogo || undefined}
              pageNum={pageNum}
              totalPages={totalPages}
              pageNumberPosition={pageNumberPosition}
              showPageNumbers={showHeaderPageNumbers}
            />
            {sheet.playHeader ? (
              <div
                id={`fc-play-${sheet.play.id}`}
                data-fc-play-id={sheet.play.id}
                className="fd-play-anchor"
                aria-hidden
              />
            ) : null}
            <div
              className={`fd-grid ${chunkGrid.gridClass} fd-grid-with-header`}
              style={gridStyle}
            >
              {chunk.map((item) => (
                <FrameCell
                  key={`${item.playId}-${item.frameId}`}
                  item={item}
                  courtView={sheet.play.courtView}
                  includeNotes={settings.includeNotes !== false}
                />
              ))}
              {pad > 0
                ? Array.from({ length: pad }, (_, j) => (
                    <EmptyCell
                      key={`empty-${i}-${j}`}
                      includeNotes={settings.includeNotes !== false}
                    />
                  ))
                : null}
            </div>
            <PageFooter
              pageNum={pageNum}
              totalPages={totalPages}
              showPageNumbers={showFooterPageNumbers}
              footerText={footerText}
              pageNumberPosition={pageNumberPosition}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
