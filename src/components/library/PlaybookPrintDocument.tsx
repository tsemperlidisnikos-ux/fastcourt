"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { useSettingsStore } from "@/stores/settings-store";
import {
  getPaperDimensions,
  toPlaybookPrintSettings,
} from "@/lib/library/playbook-print-config";
import {
  buildPlaybookTocEntries,
  computePlaybookPagination,
  DEFAULT_PLAYBOOK_PRINT_SETTINGS,
  FASTDRAW_TOC_ENTRIES_PER_PAGE,
  getPlaybookBadgeLabel,
  getPlaybookGridLayout,
  stripNotesForPrint,
  type PlaybookFrameItem,
  type PlaybookPrintSettings,
} from "@/lib/library/playbook-print";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";
import type { StoredPlay } from "@/types/library";

interface Props {
  playbookName: string;
  team?: string;
  subtitle?: string;
  plays: StoredPlay[];
  printConfig?: PlaybookPrintConfig;
  settings?: Partial<PlaybookPrintSettings>;
  scrollToPlayId?: string | null;
}

function DocHeader({
  left,
  right,
  logoSrc,
}: {
  left: string;
  right?: string;
  logoSrc?: string;
}) {
  return (
    <div className="fd-head">
      <span className="fd-head-left">{left}</span>
      <span className="fd-head-center">
        {logoSrc ? (
          <img src={logoSrc} className="fd-head-logo" alt="" />
        ) : null}
      </span>
      <span className="fd-head-right">{right ?? ""}</span>
    </div>
  );
}

function PageFooter({
  pageNum,
  totalPages,
  show,
}: {
  pageNum: number;
  totalPages: number;
  show: boolean;
}) {
  if (!show) {
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
      <span />
      <span className="fd-foot-page">
        {pageNum} / {totalPages}
      </span>
      <span />
    </div>
  );
}

function PlayBlockHeader({ play }: { play: StoredPlay }) {
  const badge = getPlaybookBadgeLabel(play);
  const team =
    play.team && play.team !== "No Team" ? play.team : "";
  const frameCount = play.frames.length;

  return (
    <div
      className="fd-play-header"
      id={`fc-play-${play.id}`}
      data-fc-play-id={play.id}
    >
      <div className="fd-play-header-row">
        <span className="fd-play-header-badge">{badge}</span>
        <h2 className="fd-play-header-title">{play.title || "Untitled"}</h2>
        {team ? <span className="fd-play-header-meta">{team}</span> : null}
        <span className="fd-play-header-frames">
          {frameCount} frame{frameCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

function FrameCell({
  item,
  hidePlayTitle,
  includeNotes,
}: {
  item: PlaybookFrameItem;
  hidePlayTitle: boolean;
  includeNotes: boolean;
}) {
  const notesText = stripNotesForPrint(item.notes);
  return (
    <div className="fd-cell">
      <div className="fd-cell-meta">
        <div className="fd-cell-meta-main">
          <div className="fd-cell-series">{item.series || "\u00a0"}</div>
          {hidePlayTitle ? (
            <div className="fd-cell-title fd-cell-title-spacer" aria-hidden />
          ) : (
            <div className="fd-cell-title">{item.playTitle}</div>
          )}
        </div>
        {item.frameNum ? (
          <span className="fd-cell-frame-num">
            {item.frameNum}
            {item.frameTotal ? `/${item.frameTotal}` : ""}
          </span>
        ) : null}
      </div>
      <div className="fd-cell-court">
        <CourtFrameThumbnail
          courtType={item.courtType}
          frame={item.frame}
          size="print"
          alt={item.frameName}
        />
      </div>
      {includeNotes ? (
        notesText ? (
          <div className="fd-cell-notes">{notesText}</div>
        ) : (
          <div className="fd-cell-notes fd-cell-notes-empty" aria-hidden />
        )
      ) : null}
    </div>
  );
}

function EmptyCell({ includeNotes }: { includeNotes: boolean }) {
  return (
    <div className="fd-cell fd-cell-empty" aria-hidden>
      <div className="fd-cell-meta">
        <div className="fd-cell-series fd-cell-series-spacer" aria-hidden />
        <div className="fd-cell-title fd-cell-title-spacer" aria-hidden />
      </div>
      <div className="fd-cell-court" />
      {includeNotes ? (
        <div className="fd-cell-notes fd-cell-notes-empty" aria-hidden />
      ) : null}
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
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const teamLogo = useSettingsStore((s) => s.pdfBrand.logoDataUrl?.trim() ?? "");
  const settings = {
    ...DEFAULT_PLAYBOOK_PRINT_SETTINGS,
    ...(printConfig ? toPlaybookPrintSettings(printConfig) : {}),
    ...settingsProp,
  };
  const cover = printConfig?.cover;
  const safeTitle = (playbookName || "Playbook").toUpperCase();
  const displayTeam =
    team && team !== "No Team" ? team : "";
  const coverSubtitle =
    cover?.subtitle?.trim() || subtitle?.trim() || "";

  const pageDims = printConfig ? getPaperDimensions(printConfig) : null;
  const scaleWrapStyle = useMemo(() => {
    const scale = printConfig?.scalePdf ?? 100;
    if (scale === 100) return undefined;
    return {
      transform: `scale(${scale / 100})`,
      transformOrigin: "top center",
    } as CSSProperties;
  }, [printConfig?.scalePdf]);

  const printPageCss = useMemo(() => {
    if (!pageDims) return "";
    return `@page { size: ${pageDims.paperCss} ${pageDims.orientation}; margin: ${pageDims.marginVerticalMm}mm ${pageDims.marginHorizontalMm}mm; }`;
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
      style["--fd-cover-title-size"] = `${cover.titleFontSize}px`;
      style["--fd-cover-title-margin-top"] = `${cover.titleMarginTop}px`;
      style["--fd-cover-subtitle-size"] = `${cover.subtitleFontSize}px`;
      style["--fd-cover-subtitle-margin-top"] = `${cover.subtitleMarginTop}px`;
    }
    return style as CSSProperties;
  }, [pageDims, printConfig, cover]);

  const gridLayout = useMemo(
    () =>
      getPlaybookGridLayout(
        printConfig?.orientation ?? settings.orientation ?? "portrait",
      ),
    [printConfig?.orientation, settings.orientation],
  );

  const pagination = useMemo(
    () => computePlaybookPagination(plays, settings),
    [plays, settings],
  );

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
  const showPageNumbers = settings.includePageNumbers !== false;

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

  return (
    <div className="fc-playbook-print-scale-outer" style={scaleWrapStyle}>
      {printPageCss ? (
        <style
          data-fc-playbook-print-page
          dangerouslySetInnerHTML={{ __html: printPageCss }}
        />
      ) : null}
      <div
        className="fc-playbook-print-root"
        ref={rootRef}
        style={rootStyle}
        data-print-orientation={pageDims?.orientation ?? "portrait"}
        data-print-paper={pageDims?.paperCss ?? "A4"}
      >
      {settings.includeCover !== false ? (
        <div className="fd-sheet fd-cover-sheet fd-cover-v2 page-break">
          {displayTeam || coverSubtitle || teamLogo ? (
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
                {displayTeam ? (
                  <div className="fd-cover-club-name">{displayTeam}</div>
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
          <PageFooter pageNum={1} totalPages={totalPages} show={showPageNumbers} />
        </div>
      ) : null}

      {settings.includeToc !== false && plays.length > 0
        ? Array.from({ length: tocPages }, (_, p) => {
            const slice = tocEntries.slice(
              p * FASTDRAW_TOC_ENTRIES_PER_PAGE,
              (p + 1) * FASTDRAW_TOC_ENTRIES_PER_PAGE,
            );
            const pageNum = coverPages + p + 1;
            const contSuffix = p === 0 ? "" : "Contents (cont.)";
            return (
              <div key={`toc-${p}`} className="fd-sheet fd-toc-sheet page-break">
                <DocHeader
                  left={safeTitle}
                  right={contSuffix}
                  logoSrc={teamLogo || undefined}
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
                  show={showPageNumbers}
                />
              </div>
            );
          })
        : null}

      {pagination.contentSheets.map((sheet, i) => {
        const pageNum = coverPages + tocPages + i + 1;
        if (sheet.type === "section") {
          const countLabel = `${sheet.count || 0} play${sheet.count === 1 ? "" : "s"}`;
          return (
            <div
              key={`section-${sheet.label}-${i}`}
              className="fd-sheet fd-section-sheet page-break"
            >
              <DocHeader
                left={safeTitle}
                right={sheet.label || "Section"}
                logoSrc={teamLogo || undefined}
              />
              <div className="fd-section-body">
                <div className="fd-section-eyebrow">Playbook Section</div>
                <h1 className="fd-section-title">{sheet.label || "Section"}</h1>
                <div className="fd-section-count">{countLabel}</div>
              </div>
              <PageFooter
                pageNum={pageNum}
                totalPages={totalPages}
                show={showPageNumbers}
              />
            </div>
          );
        }

        const chunk = sheet.items;
        const pad = gridLayout.framesPerPage - chunk.length;
        const playName = sheet.play.title || "";
        const headerRight = playName
          ? sheet.playContinued
            ? `${playName} (cont.)`
            : playName
          : "";

        const separatePlay = playSheetSeparateFlags[i] ?? false;

        return (
          <div
            key={`grid-${sheet.play.id}-${i}`}
            className={`fd-sheet fd-content-sheet page-break${separatePlay ? " fd-play-separate-page" : ""}`}
          >
            <DocHeader
              left={safeTitle}
              right={headerRight}
              logoSrc={teamLogo || undefined}
            />
            {sheet.playHeader ? <PlayBlockHeader play={sheet.play} /> : null}
            <div
              className={`fd-grid ${gridLayout.gridClass} fd-grid-with-header`}
            >
              {chunk.map((item) => (
                <FrameCell
                  key={`${item.playId}-${item.frameId}`}
                  item={item}
                  hidePlayTitle={!!sheet.playHeader}
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
              show={showPageNumbers}
            />
          </div>
        );
      })}
      </div>
    </div>
  );
}
