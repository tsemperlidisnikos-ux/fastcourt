"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Arc, Group, Image as KonvaImage, Layer, Line, Rect, Stage } from "react-konva";
import {
  FD_FULL_COURT_ASPECT,
  FD_HALF_COURT_ASPECT,
  HALF_COURT_BASKET_NY,
} from "@/lib/designer/constants";
import {
  getDesignerStripThumbnailScale,
  getThumbnailPlayerFontSize,
  getThumbnailVisualScale,
} from "@/lib/designer/action-geometry";
import {
  computeCourtViewLayout,
  courtNormToStage,
} from "@/lib/designer/court-view-layout";
import { getLibraryPreviewThumbSize } from "@/lib/library/library-preview-thumb-size";
import { useCourtImage } from "@/lib/designer/use-court-image";
import { CourtActionShape } from "@/components/designer/CourtActionShape";
import { PlayerMarker } from "@/components/designer/PlayerMarker";
import type { CourtRect, CourtType, DesignerFrame } from "@/types/designer";

export type CourtFrameThumbnailSize = "sm" | "lg" | "print";

interface Props {
  courtType: CourtType;
  frame: DesignerFrame;
  className?: string;
  alt?: string;
  /** lg = designer strip; sm = library preview; print = print preview modal */
  size?: CourtFrameThumbnailSize;
}

function FallbackCourtFloor({
  court,
  courtType,
}: {
  court: CourtRect;
  courtType: CourtType;
}) {
  const midX = court.x + court.width / 2;
  const hoopY = court.y + court.height * HALF_COURT_BASKET_NY;
  const arcRadius = Math.min(court.width, court.height) * 0.12;

  return (
    <Group listening={false}>
      <Rect
        x={court.x}
        y={court.y}
        width={court.width}
        height={court.height}
        fill="#fffaf5"
        stroke="#1e293b"
        strokeWidth={1.5}
      />
      <Line
        points={[midX, court.y, midX, court.y + court.height]}
        stroke="#94a3b8"
        strokeWidth={1}
        dash={courtType === "full" ? undefined : [6, 4]}
      />
      <Arc
        x={midX}
        y={hoopY}
        innerRadius={0}
        outerRadius={arcRadius}
        angle={180}
        rotation={0}
        stroke="#64748b"
        strokeWidth={1.5}
      />
    </Group>
  );
}

function deriveSmHeight(width: number, courtType: CourtType) {
  const courtAspect =
    courtType === "full" ? FD_FULL_COURT_ASPECT : FD_HALF_COURT_ASPECT;
  const fitScale = courtType === "full" ? 0.95 : 0.9;
  return Math.max(1, Math.round((width / courtAspect) * fitScale));
}

function fitCourtThumbInBox(
  boxW: number,
  boxH: number,
  courtType: CourtType,
): { width: number; height: number } {
  const courtAspect =
    courtType === "full" ? FD_FULL_COURT_ASPECT : FD_HALF_COURT_ASPECT;
  const fitScale = courtType === "full" ? 0.95 : 0.9;
  let thumbW = Math.max(1, Math.floor(boxW));
  let thumbH = deriveSmHeight(thumbW, courtType);
  if (boxH > 8 && thumbH > boxH) {
    thumbH = Math.max(1, Math.floor(boxH));
    thumbW = Math.max(1, Math.floor((thumbH / fitScale) * courtAspect));
    thumbH = deriveSmHeight(thumbW, courtType);
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
}: Props) {
  const isLarge = size === "lg";
  const isPrint = size === "print";
  const playerRadiusMul = isLarge ? 0.022 : isPrint ? 0.017 : 0.026;
  const playerRadiusMin = isLarge ? 5.5 : isPrint ? 4 : 7;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(() => ({
    width: 160,
    height: isLarge ? 110 : deriveSmHeight(160, "half"),
  }));

  const { image, failed } = useCourtImage(courtType);

  const viewLayout = useMemo(
    () =>
      computeCourtViewLayout(
        containerSize.width,
        containerSize.height,
        courtType,
      ),
    [containerSize.width, containerSize.height, courtType],
  );

  const stageWidth = Math.max(1, containerSize.width);
  const stageHeight = Math.max(1, containerSize.height);
  const actionCompactScale = isLarge
    ? getDesignerStripThumbnailScale(viewLayout.court.width)
    : getThumbnailVisualScale(viewLayout.court.width) * (isPrint ? 0.68 : 0.72);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const courtHost = el.closest(
        ".fc-print-frame-court, .org-preview-frame-court, .fd-cell-court, .frame-item-court, .ds-thumb-court",
      ) as HTMLElement | null;
      const frameCard = el.closest(
        ".org-preview-frame-card",
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

      if (inPlaybookGrid && courtHost) {
        const box = courtHost.getBoundingClientRect();
        const padX = 2;
        const padY = 2;
        const sized = fitCourtThumbInBox(
          Math.max(1, Math.floor(box.width - padX)),
          Math.max(0, Math.floor(box.height - padY)),
          courtType,
        );
        setContainerSize(sized);
        return;
      }

      if (inLibraryPreview && previewGrid) {
        const sized = getLibraryPreviewThumbSize(
          previewGrid.clientWidth,
          courtType,
        );
        setContainerSize({
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
          height = deriveSmHeight(width, courtType);
        }
        setContainerSize({ width, height: Math.max(1, height) });
        return;
      }

      setContainerSize({ width, height: deriveSmHeight(width, courtType) });
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    const courtHost = el.closest(
      ".fc-print-frame-court, .org-preview-frame-court, .fd-cell-court, .frame-item-court, .ds-thumb-court",
    ) as HTMLElement | null;
    const frameCard = el.closest(
      ".org-preview-frame-card",
    ) as HTMLElement | null;
    const gridCell = el.closest(".fd-cell") as HTMLElement | null;
    const previewGrid = el.closest(".org-preview-frames") as HTMLElement | null;
    const observeTargets = new Set<HTMLElement>();
    for (const node of [
      courtHost,
      frameCard,
      previewGrid,
      gridCell,
      el.parentElement,
      el,
    ]) {
      if (node instanceof HTMLElement) observeTargets.add(node);
    }
    observeTargets.forEach((node) => ro.observe(node));
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [courtType, isLarge, isPrint]);

  const objects = frame.objects.filter((o) => o.kind !== "ball");

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
      style={{
        width: isLarge ? "100%" : size === "sm" ? undefined : "100%",
        maxWidth: "100%",
        height: isLarge ? "100%" : undefined,
        lineHeight: 0,
        overflow: "hidden",
        margin: size === "sm" ? "0 auto" : undefined,
        flexShrink: size === "sm" ? 0 : undefined,
      }}
    >
      <Stage width={stageWidth} height={stageHeight} listening={false}>
        <Layer listening={false}>
          {image && !failed ? (
            <KonvaImage
              image={image}
              x={viewLayout.court.x}
              y={viewLayout.court.y}
              width={viewLayout.court.width}
              height={viewLayout.court.height}
            />
          ) : (
            <FallbackCourtFloor
              court={viewLayout.court}
              courtType={courtType}
            />
          )}
          {(frame.actions ?? []).map((action) => (
            <CourtActionShape
              key={action.id}
              action={action}
              court={viewLayout.court}
              courtType={courtType}
              compact
              compactScale={actionCompactScale}
              interactive={false}
            />
          ))}
          {objects.map((object) => {
            const pos = courtNormToStage(
              viewLayout.court,
              courtType,
              object.x,
              object.y,
            );
            const radius = Math.max(
              playerRadiusMin,
              viewLayout.court.width * playerRadiusMul,
            );
            const baseFontSize = getThumbnailPlayerFontSize(
              viewLayout.court.width,
              courtType,
              object.kind === "defense" ? "defense" : "offense",
            );
            const compactFontSize = !isLarge
              ? isPrint
                ? Math.max(10, Math.round(baseFontSize * 0.58))
                : baseFontSize
              : undefined;
            return (
              <PlayerMarker
                key={object.id}
                object={object}
                x={pos.x}
                y={pos.y}
                radius={radius}
                court={viewLayout.court}
                compact
                compactFontSize={compactFontSize}
                compactStrokeWidth={isPrint ? 1.1 : 1.05}
              />
            );
          })}
          {(frame.whiteboardStrokes ?? []).map((stroke, i) => {
            const stagePts: number[] = [];
            for (let j = 0; j < stroke.points.length; j += 2) {
              const p = courtNormToStage(
                viewLayout.court,
                courtType,
                stroke.points[j],
                stroke.points[j + 1],
              );
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
  );
}
