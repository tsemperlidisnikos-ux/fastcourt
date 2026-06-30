"use client";

import { useEffect, useMemo, useRef } from "react";
import { PlaybookPrintDocument } from "@/components/library/PlaybookPrintDocument";
import { PlaybookPreviewToolbar } from "@/components/library/PlaybookPreviewToolbar";
import {
  buildPlaybookPageList,
  DEFAULT_PLAYBOOK_PRINT_SETTINGS,
} from "@/lib/library/playbook-print";
import { toPlaybookPrintSettings } from "@/lib/library/playbook-print-config";
import type { PlaybookSection } from "@/types/library-meta";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";
import type { StoredPlay } from "@/types/library";

interface Props {
  playbook: PlaybookSection;
  plays: StoredPlay[];
  printConfig?: PlaybookPrintConfig;
  selectedPageIndex: number;
  focusPageIndex?: number | null;
  onFocusPageHandled?: () => void;
  zoomPct: number;
  onPageChange: (index: number) => void;
  onZoomChange: (pct: number) => void;
  loading?: boolean;
}

export function PlaybookInlinePreview({
  playbook,
  plays,
  printConfig,
  selectedPageIndex,
  focusPageIndex = null,
  onFocusPageHandled,
  zoomPct,
  onPageChange,
  onZoomChange,
  loading,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressScrollSpy = useRef(false);
  const scrollRaf = useRef(0);

  const settings = useMemo(
    () => ({
      ...DEFAULT_PLAYBOOK_PRINT_SETTINGS,
      ...(printConfig ? toPlaybookPrintSettings(printConfig) : {}),
    }),
    [printConfig],
  );

  const pages = useMemo(
    () => buildPlaybookPageList(plays, settings).pages,
    [plays, settings],
  );

  useEffect(() => {
    if (focusPageIndex == null) return;
    const root = scrollRef.current;
    const target = root?.querySelector<HTMLElement>(
      `[data-fc-page-index="${focusPageIndex}"]`,
    );
    if (!root || !target) {
      onFocusPageHandled?.();
      return;
    }

    suppressScrollSpy.current = true;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const timer = window.setTimeout(() => {
      suppressScrollSpy.current = false;
      onFocusPageHandled?.();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [focusPageIndex, onFocusPageHandled, pages.length]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !pages.length) return;

    function syncVisiblePage() {
      if (suppressScrollSpy.current) return;
      const container = scrollRef.current;
      if (!container) return;

      const anchorY = container.getBoundingClientRect().top + container.clientHeight * 0.32;
      let nextIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      container.querySelectorAll<HTMLElement>("[data-fc-page-index]").forEach((el) => {
        const index = Number(el.dataset.fcPageIndex);
        if (!Number.isFinite(index)) return;
        const distance = Math.abs(el.getBoundingClientRect().top - anchorY);
        if (distance < bestDistance) {
          bestDistance = distance;
          nextIndex = index;
        }
      });

      if (nextIndex !== selectedPageIndex) {
        onPageChange(nextIndex);
      }
    }

    function handleScroll() {
      window.cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = window.requestAnimationFrame(syncVisiblePage);
    }

    root.addEventListener("scroll", handleScroll, { passive: true });
    syncVisiblePage();
    return () => {
      root.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(scrollRaf.current);
    };
  }, [onPageChange, pages.length, selectedPageIndex]);

  if (loading) {
    return (
      <div
        className="fc-playbooks-playbook-preview-loading"
        id="fc-playbooks-playbook-preview-loading"
      >
        Building print preview…
      </div>
    );
  }

  if (!plays.length || !printConfig) {
    return (
      <div
        className="fc-playbooks-playbook-preview-loading"
        id="fc-playbooks-playbook-preview-loading"
      />
    );
  }

  return (
    <section
      className="fc-playbooks-playbook-preview-pane"
      id="fc-playbooks-playbook-preview-pane"
      aria-label="Playbook print preview"
    >
      <PlaybookPreviewToolbar zoomPct={zoomPct} onZoomChange={onZoomChange} />
      <div
        ref={scrollRef}
        className="fc-playbooks-playbook-preview-scroll"
        id="fc-playbooks-playbook-preview-scroll"
      >
        <div
          className="fc-playbooks-playbook-preview-zoom-wrap"
          style={{
            transform: `scale(${zoomPct / 100})`,
            transformOrigin: "top center",
          }}
        >
          <PlaybookPrintDocument
            playbookName={playbook.name}
            team={playbook.team}
            subtitle={playbook.subtitle}
            plays={plays}
            printConfig={printConfig}
          />
        </div>
      </div>
    </section>
  );
}
