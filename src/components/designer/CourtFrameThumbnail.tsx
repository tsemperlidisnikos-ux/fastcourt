"use client";

import { useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import { getCourtAspect } from "@/lib/designer/court-hg-templates";
import {
  getDesignerStripPlayerFontSize,
  getDesignerStripThumbnailScale,
  getThumbnailPlayerFontSize,
  getThumbnailVisualScale,
} from "@/lib/designer/action-geometry";
import {
  mergeCourtViewSettings,
  resolvePlayCourtAppearance,
} from "@/lib/designer/court-view-settings";
import {
  computeCourtViewLayout,
  courtNormToStage,
  placementNormToStage,
  type CourtCoordSpace,
} from "@/lib/designer/court-view-layout";
import { frameObjectsForDesignerThumbnail } from "@/lib/designer/thumbnail-objects";
import { getLibraryPreviewThumbSize } from "@/lib/library/library-preview-thumb-size";
import { useCourtImage } from "@/lib/designer/use-court-image";
import { CourtActionShape } from "@/components/designer/CourtActionShape";
import { PlayerMarker } from "@/components/designer/PlayerMarker";
import { VectorCourtFloor } from "@/components/designer/VectorCourtFloor";
import { WoodCourtCssUnderlay } from "@/components/designer/WoodCourtCssUnderlay";
import { useSettingsStore } from "@/stores/settings-store";
import type {
  CourtTemplate,
  CourtType,
  CourtViewSettings,
  DesignerFrame,
} from "@/types/designer";

export type CourtFrameThumbnailSize = "sm" | "lg" | "print";

interface Props {
  courtType: CourtType;
  frame: DesignerFrame;
  className?: string;
  alt?: string;
  /** lg = designer strip; sm = library preview; print = print preview modal */
  size?: CourtFrameThumbnailSize;
  courtTemplate?: CourtTemplate;
  courtView?: CourtViewSettings | null;
}

function deriveSmHeight(
  width: number,
  courtType: CourtType,
  courtTemplate: CourtTemplate = "NCAA",
  fitScaleOverride?: number,
) {
  const courtAspect = getCourtAspect(courtTemplate, courtType);
  const fitScale =
    fitScaleOverride ?? (courtType === "full" ? 0.95 : 0.9);
  return Math.max(1, Math.round((width / courtAspect) * fitScale));
}

function fitCourtThumbInBox(
  boxW: number,
  boxH: number,
  courtType: CourtType,
  courtTemplate: CourtTemplate = "NCAA",
  fitScaleOverride?: number,
  fillBox = false,
): { width: number; height: number } {
  const courtAspect = getCourtAspect(courtTemplate, courtType);
  const fitScale =
    fitScaleOverride ?? (courtType === "full" ? 0.95 : 0.9);

  if (fillBox && boxW > 0 && boxH > 0) {
    const byWidth = {
      width: boxW,
      height: (boxW / courtAspect) * fitScale,
    };
    const byHeight = {
      width: (boxH / fitScale) * courtAspect,
      height: boxH,
    };

    let sized = byWidth;
    if (byWidth.height > boxH) {
      sized = byHeight;
    } else if (
      byHeight.width <= boxW &&
      byHeight.width * byHeight.height > byWidth.width * byWidth.height
    ) {
      sized = byHeight;
    }

    return {
      width: Math.max(1, Math.floor(sized.width)),
      height: Math.max(1, Math.floor(sized.height)),
    };
  }

  let thumbW = Math.max(1, Math.floor(boxW));
  let thumbH = deriveSmHeight(thumbW, courtType, courtTemplate, fitScale);
  if (boxH > 8 && thumbH > boxH) {
    thumbH = Math.max(1, Math.floor(boxH));
    thumbW = Math.max(1, Math.floor((thumbH / fitScale) * courtAspect));
    thumbH = deriveSmHeight(thumbW, courtType, courtTemplate, fitScale);
  }
  return {
    width: Math.max(1, thumbW),
    height: Math.max(1, thumbH),
  };
}

export function CourtFrameThumbnail({
  courtType,
  frame,
  className,
  alt,
  size = "lg",
  courtTemplate,
  courtView,
}: Props) {
  const mergedCourtView = useMemo(() => {
    const merged = mergeCourtViewSettings(courtView);
    return courtTemplate ? { ...merged, template: courtTemplate } : merged;
  }, [courtView, courtTemplate]);
  const isLarge = size === "lg";
  const isPrint = size === "print";
  const playerRadiusMul = isLarge ? 0.022 : isPrint ? 0.017 : 0.026;
  const playerRadiusMin = isLarge ? 5.5 : isPrint ? 4 : 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(() => ({
    width: 160,
    height: isLarge
      ? 110
      : deriveSmHeight(160, "half", mergedCourtView.template),
  }));
  const applyContainerSize = useCallback((next: { width: number; height: number }) => {
    setContainerSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next,
    );
  }, []);

  const { image, failed } = useCourtImage(courtType);
  const appearance = useSettingsStore((s) => s.appearance);
  const courtAppearance = useMemo(
    () => resolvePlayCourtAppearance(courtView, appearance),
    [courtView, appearance],
  );
  const courtRenderMode = appearance.courtRenderMode;
  const useRasterCourt =
    courtRenderMode === "image" && image && !failed;
  const woodFloorViaCss =
    !useRasterCourt &&
    courtAppearance.showWoodTiles &&
    !mergedCourtView.angle &&
    !isPrint;

  const viewLayout = useMemo(
    () =>
      computeCourtViewLayout(
        containerSize.width,
        containerSize.height,
        courtType,
        {
          oob:
            mergedCourtView.sidelinesFt > 0 ? "sideline-both" : "none",
          sidelinesFt: mergedCourtView.sidelinesFt,
        },
        mergedCourtView.template,
      ),
    [
      containerSize.width,
      containerSize.height,
      courtType,
      mergedCourtView.sidelinesFt,
      mergedCourtView.template,
    ],
  );

  const courtCoords: CourtCoordSpace = useRasterCourt ? "raster" : "vector";

  function objectToStage(nx: number, ny: number) {
    if (courtCoords === "vector") {
      return placementNormToStage(
        viewLayout,
        courtType,
        nx,
        ny,
        courtCoords,
      );
    }
    return courtNormToStage(
      viewLayout.court,
      courtType,
      nx,
      ny,
      courtCoords,
    );
  }

  const stageWidth = Math.max(1, containerSize.width);
  const stageHeight = Math.max(1, containerSize.height);
  const actionCompactScale = isLarge
    ? getDesignerStripThumbnailScale(viewLayout.court.width, courtType)
    : getThumbnailVisualScale(viewLayout.court.width, courtType) *
      (isPrint ? 0.68 : 0.72);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let active = true;

    const measure = () => {
      if (!active) return;
      const courtHost = el.closest(
        ".fc-print-frame-court, .org-preview-frame-court, .fd-cell-court, .frame-item-court, .ds-thumb-court",
      ) as HTMLElement | null;
      const gridCell = el.closest(".fd-cell") as HTMLElement | null;
      const host = courtHost ?? el.parentElement ?? el;
      const previewGrid = el.closest(".org-preview-frames") as HTMLElement | null;
      const inLibraryPreview =
        !isLarge &&
        !isPrint &&
        courtHost?.classList.contains("org-preview-frame-court");

      let width = Math.floor(host.getBoundingClientRect().width);
      if (width <= 0) {
        width = Math.floor(el.getBoundingClientRect().width);
      }
      if (width <= 0 && gridCell) {
        width = Math.floor(gridCell.getBoundingClientRect().width);
      }
      if (width <= 0) {
        width = 120;
      }

      const inPlaybookGrid =
        isPrint &&
        courtHost?.classList.contains("fd-cell-court") &&
        !!courtHost.closest(".fc-playbook-print-root");

      const inPracticePrint =
        isPrint &&
        !!courtHost?.classList.contains("fc-practice-frame-court");

      const inLibraryPrint =
        isPrint &&
        !!courtHost?.classList.contains("fc-print-frame-court");

      if (inPracticePrint) {
        const box = (courtHost ?? el).getBoundingClientRect();
        let width = Math.floor(box.width);
        if (width <= 8) {
          const cell = el.closest(
            ".fc-practice-plan-frames-cell",
          ) as HTMLElement | null;
          const cellWidth = Math.floor(cell?.getBoundingClientRect().width ?? 0);
          width = cellWidth > 0 ? Math.floor(cellWidth / 3) : 220;
        }
        const sized = fitCourtThumbInBox(
          Math.max(1, Math.floor(width * 0.92)),
          175,
          courtType,
          mergedCourtView.template,
        );
        applyContainerSize(sized);
        return;
      }

      if (inLibraryPrint) {
        const box = (courtHost ?? el).getBoundingClientRect();
        let width = Math.floor(box.width);
        if (width <= 8) {
          const card = el.closest(".fc-print-frame-card") as HTMLElement | null;
          width = Math.floor(card?.getBoundingClientRect().width ?? 0);
        }
        if (width <= 8) width = 320;
        const sized = fitCourtThumbInBox(
          width,
          220,
          courtType,
          mergedCourtView.template,
        );
        applyContainerSize(sized);
        return;
      }

      if (inPlaybookGrid && courtHost && gridCell) {
        let width = Math.floor(gridCell.clientWidth);
        if (width <= 8) {
          width = Math.floor(courtHost.clientWidth);
        }
        if (width <= 8) width = 320;
        if (courtHost.clientWidth > 12) {
          width = Math.max(width, courtHost.clientWidth);
        }
        const sized = fitCourtThumbInBox(
          width,
          9999,
          courtType,
          mergedCourtView.template,
          1,
          false,
        );
        applyContainerSize(sized);
        return;
      }

      if (inLibraryPreview && previewGrid) {
        const sized = getLibraryPreviewThumbSize(
          previewGrid.clientWidth,
          courtType,
          undefined,
          mergedCourtView.template,
        );
        applyContainerSize({
          width: sized.thumbWidth,
          height: sized.thumbHeight,
        });
        return;
      }

      const fillHost = isLarge;

      if (fillHost) {
        let height = Math.floor(host.getBoundingClientRect().height);
        if (height <= 0) {
          height = Math.floor(el.getBoundingClientRect().height);
        }
        if (height <= 0) {
          height = deriveSmHeight(width, courtType, mergedCourtView.template);
        }
        applyContainerSize({ width, height: Math.max(1, height) });
        return;
      }

      applyContainerSize({
        width,
        height: deriveSmHeight(width, courtType, mergedCourtView.template),
      });
    };

    const measureRaf = { id: 0 };
    const scheduleMeasure = () => {
      if (measureRaf.id) return;
      measureRaf.id = requestAnimationFrame(() => {
        measureRaf.id = 0;
        measure();
      });
    };

    const ro = new ResizeObserver(() => scheduleMeasure());
    const courtHost = el.closest(
      ".fc-print-frame-court, .org-preview-frame-court, .fd-cell-court, .frame-item-court, .ds-thumb-court",
    ) as HTMLElement | null;
    const frameCard = el.closest(
      ".org-preview-frame-card",
    ) as HTMLElement | null;
    const gridCell = el.closest(".fd-cell") as HTMLElement | null;
    const cellStack = el.closest(".fd-cell-stack") as HTMLElement | null;
    const practiceStack = el.closest(
      ".fc-practice-frame-stack",
    ) as HTMLElement | null;
    const printStack = el.closest(".fc-print-frame-stack") as HTMLElement | null;
    const previewGrid = el.closest(".org-preview-frames") as HTMLElement | null;
    const notesEl = (gridCell ?? practiceStack ?? printStack)?.querySelector(
      ".fd-cell-notes:not(.fd-cell-notes-empty), .fc-practice-frame-notes, .fc-print-frame-notes",
    ) as HTMLElement | null;
    const observeTargets = new Set<HTMLElement>();
    for (const node of [
      courtHost,
      frameCard,
      previewGrid,
      gridCell,
      cellStack,
      practiceStack,
      printStack,
      notesEl,
      el.parentElement,
      el,
    ]) {
      if (node instanceof HTMLElement) observeTargets.add(node);
    }
    observeTargets.forEach((node) => ro.observe(node));
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      if (!active) return;
      raf2 = requestAnimationFrame(scheduleMeasure);
    });
    return () => {
      active = false;
      ro.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (measureRaf.id) cancelAnimationFrame(measureRaf.id);
    };
  }, [
    applyContainerSize,
    courtType,
    mergedCourtView.template,
    mergedCourtView.sidelinesFt,
    isLarge,
    isPrint,
  ]);

  const printLayoutVarsRef = useRef({
    stageWidth: 0,
    courtX: 0,
    courtWidth: 0,
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || !isPrint) return;
    const stack = (el.closest(".fd-cell-stack") ??
      el.closest(".fc-practice-frame-stack") ??
      el.closest(".fc-print-frame-stack")) as HTMLElement | null;
    if (!stack) return;
    if (
      stack.classList.contains("fd-cell-stack") &&
      !stack.closest(".fc-playbook-print-root")
    ) {
      return;
    }

    const prev = printLayoutVarsRef.current;
    if (
      prev.stageWidth === stageWidth &&
      prev.courtX === viewLayout.court.x &&
      prev.courtWidth === viewLayout.court.width
    ) {
      return;
    }

    printLayoutVarsRef.current = {
      stageWidth,
      courtX: viewLayout.court.x,
      courtWidth: viewLayout.court.width,
    };
    stack.style.setProperty("--fc-stage-width", `${stageWidth}px`);
    stack.style.setProperty("--fc-note-inset-left", `${viewLayout.court.x}px`);
    stack.style.setProperty("--fc-note-width", `${viewLayout.court.width}px`);
  }, [
    isPrint,
    viewLayout.court.x,
    viewLayout.court.width,
    containerSize.width,
    containerSize.height,
    stageWidth,
  ]);

  const objects = useMemo(
    () => frameObjectsForDesignerThumbnail(frame),
    [frame],
  );

  const thumbClassName = [
    className,
    size === "sm" ? "fc-lib-preview-court-thumb" : "",
    size === "sm"
      ? courtType === "full"
        ? "fc-lib-preview-court-thumb--full"
        : "fc-lib-preview-court-thumb--half"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={thumbClassName}
      aria-label={alt}
      data-fc-await-wood-texture={
        isPrint &&
        courtAppearance.showWoodTiles &&
        !useRasterCourt &&
        !mergedCourtView.angle
          ? (courtAppearance.woodTextureId ?? "")
          : undefined
      }
      style={{
        width: isLarge
          ? "100%"
          : size === "sm"
            ? undefined
            : isPrint && containerSize.width > 1
              ? containerSize.width
              : "100%",
        maxWidth: "100%",
        height: isLarge ? "100%" : isPrint && containerSize.height > 1 ? containerSize.height : undefined,
        lineHeight: 0,
        overflow: "hidden",
        margin: size === "sm" || (isPrint && containerSize.width > 1) ? "0 auto" : undefined,
        flexShrink: size === "sm" ? 0 : undefined,
        position: woodFloorViaCss ? "relative" : undefined,
      }}
    >
      <div
        style={{
          position: "relative",
          width: stageWidth,
          height: stageHeight,
          lineHeight: 0,
        }}
      >
        {woodFloorViaCss ? (
          <WoodCourtCssUnderlay
            x={viewLayout.total.x}
            y={viewLayout.total.y}
            width={viewLayout.total.width}
            height={viewLayout.total.height}
            woodTextureId={courtAppearance.woodTextureId}
            floorColor={courtAppearance.floorColor}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            lineHeight: 0,
          }}
        >
      <Stage width={stageWidth} height={stageHeight} listening={false}>
        <Layer listening={false}>
          {useRasterCourt ? (
            <KonvaImage
              image={image}
              x={viewLayout.court.x}
              y={viewLayout.court.y}
              width={viewLayout.court.width}
              height={viewLayout.court.height}
            />
          ) : (
            <VectorCourtFloor
              court={viewLayout.court}
              floorExtent={viewLayout.total}
              courtType={courtType}
              template={mergedCourtView.template}
              floorColor={courtAppearance.floorColor}
              lineColor={courtAppearance.lineColor}
              showWoodTiles={courtAppearance.showWoodTiles}
              woodFloorViaCss={woodFloorViaCss}
              woodTextureId={courtAppearance.woodTextureId}
              featureFilters={mergedCourtView.featureFilters}
              showBaskets={mergedCourtView.showBaskets}
              angle={mergedCourtView.angle}
              sidelinesFt={mergedCourtView.sidelinesFt}
            />
          )}
          {(frame.actions ?? []).map((action) => (
            <CourtActionShape
              key={action.id}
              action={action}
              court={viewLayout.court}
              courtType={courtType}
              courtCoords={courtCoords}
              compact
              compactScale={actionCompactScale}
              interactive={false}
            />
          ))}
          {objects.map((object) => {
            const pos = objectToStage(object.x, object.y);
            const radius = Math.max(
              playerRadiusMin,
              viewLayout.court.width * playerRadiusMul,
            );
            const baseFontSize = getThumbnailPlayerFontSize(
              viewLayout.court.width,
              courtType,
              object.kind === "defense" ? "defense" : "offense",
            );
            const stripFontSize = getDesignerStripPlayerFontSize(
              viewLayout.court.width,
              courtType,
              object.kind === "defense" ? "defense" : "offense",
            );
            const compactFontSize = isLarge
              ? stripFontSize
              : isPrint
                ? Math.max(10, Math.round(baseFontSize * 0.58))
                : baseFontSize;
            return (
              <PlayerMarker
                key={object.id}
                object={object}
                x={pos.x}
                y={pos.y}
                radius={radius}
                court={viewLayout.court}
                compact
                ballRingMode="thumbnail"
                compactFontSize={compactFontSize}
                compactStrokeWidth={isLarge ? undefined : 1}
                ballRingStrokeWidth={isLarge ? undefined : 1}
                guardStrokeVariant="frame"
              />
            );
          })}
          {(frame.whiteboardStrokes ?? []).map((stroke, i) => {
            const stagePts: number[] = [];
            for (let j = 0; j < stroke.points.length; j += 2) {
              const p = objectToStage(stroke.points[j], stroke.points[j + 1]);
              stagePts.push(p.x, p.y);
            }
            const wbScale =
              (viewLayout.court.width / 280) *
              (isLarge ? 0.48 : isPrint ? 0.68 : 0.85);
            return (
              <Line
                key={`wb-${i}`}
                points={stagePts}
                stroke={stroke.color}
                strokeWidth={Math.max(
                  isLarge ? 0.55 : isPrint ? 0.85 : 0.95,
                  stroke.width * wbScale,
                )}
                lineCap="round"
                lineJoin="round"
                tension={0.3}
                listening={false}
              />
            );
          })}
        </Layer>
      </Stage>
        </div>
      </div>
    </div>
  );
}
