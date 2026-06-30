"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Line, Stage } from "react-konva";
import { CourtActionShape } from "@/components/designer/CourtActionShape";
import { PlayerMarker } from "@/components/designer/PlayerMarker";
import { VectorCourtFloor } from "@/components/designer/VectorCourtFloor";
import { WoodCourtCssUnderlay } from "@/components/designer/WoodCourtCssUnderlay";
import { isAnimActionActive } from "@/lib/designer/animation-engine";
import { computeCourtViewLayout, courtNormToStage } from "@/lib/designer/court-view-layout";
import {
  mergeCourtViewSettings,
  resolvePlayCourtAppearance,
} from "@/lib/designer/court-view-settings";
import { frameObjectsForDesignerThumbnail } from "@/lib/designer/thumbnail-objects";
import { useCourtImage } from "@/lib/designer/use-court-image";
import { useSettingsStore } from "@/stores/settings-store";
import type { AnimRuntimeSnapshot } from "@/lib/designer/animation-export";
import type { CourtType, CourtViewSettings, DesignerFrame } from "@/types/designer";

interface Props {
  courtType: CourtType;
  frame: DesignerFrame;
  runtime: AnimRuntimeSnapshot | null;
  courtView?: CourtViewSettings | null;
  presentation?: boolean;
  className?: string;
}

export function PlayAnimationCourtView({
  courtType,
  frame,
  runtime,
  courtView,
  presentation = false,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 480 });
  const { image, failed } = useCourtImage(courtType);
  const appearance = useSettingsStore((s) => s.appearance);
  const mergedCourtView = useMemo(
    () => mergeCourtViewSettings(courtView),
    [courtView],
  );
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
    !mergedCourtView.angle;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let active = true;

    const host =
      (presentation
        ? el.closest("#pres-court-area")
        : el.parentElement) ?? el;

    const measure = () => {
      if (!active) return;
      const rect = host.getBoundingClientRect();
      const pad = presentation ? 0 : 8;
      const width = Math.max(1, Math.floor(rect.width - pad));
      const height = Math.max(1, Math.floor(rect.height - pad));
      if (width > 0 && height > 0) setSize({ width, height });
    };

    const ro = new ResizeObserver(() => measure());
    ro.observe(host);
    if (host !== el) ro.observe(el);
    const raf = requestAnimationFrame(() => {
      if (!active) return;
      measure();
    });
    return () => {
      active = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [presentation]);

  const viewLayout = useMemo(
    () =>
      computeCourtViewLayout(size.width, size.height, courtType, {
        oob: mergedCourtView.sidelinesFt > 0 ? "sideline-both" : "none",
        sidelinesFt: mergedCourtView.sidelinesFt,
      }, mergedCourtView.template),
    [courtType, mergedCourtView.sidelinesFt, mergedCourtView.template, size.height, size.width],
  );

  const animActive = !!runtime?.active;
  const staticObjects = useMemo(
    () => frameObjectsForDesignerThumbnail(frame),
    [frame],
  );
  const displayObjects = runtime?.objects ?? staticObjects;

  const playerRadiusMul = courtType === "full" ? 0.028 : 0.034;
  const playerRadiusMin = presentation ? 12 : 10;

  return (
    <div
      ref={containerRef}
      className={[
        presentation ? "fc-pres-anim-court" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        presentation
          ? { width: "100%", height: "100%", maxWidth: 960, position: "relative" }
          : woodFloorViaCss
            ? { position: "relative" }
            : undefined
      }
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
      <Stage width={size.width} height={size.height} listening={false}>
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
              floorExtent={viewLayout.total}
            />
          )}
        </Layer>
        <Layer listening={false}>
          {(frame.actions ?? []).map((action) => {
            if (animActive && runtime) {
              const revealed = runtime.revealedActionIds.includes(action.id);
              const active = isAnimActionActive(runtime, action.id);
              if (!revealed && !active) return null;
              if (active && runtime.showActiveLine === false) return null;
              return (
                <CourtActionShape
                  key={action.id}
                  action={action}
                  court={viewLayout.court}
                  courtType={courtType}
                  selected={active}
                  revealProgress={active ? runtime.lineProgress : 1}
                  interactive={false}
                />
              );
            }
            return (
              <CourtActionShape
                key={action.id}
                action={action}
                court={viewLayout.court}
                courtType={courtType}
                interactive={false}
              />
            );
          })}
          {displayObjects.map((object) => {
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
            return (
              <PlayerMarker
                key={object.id}
                object={object}
                x={pos.x}
                y={pos.y}
                radius={radius}
                court={viewLayout.court}
                compact={false}
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
            const wbScale = viewLayout.court.width / 280;
            return (
              <Line
                key={`wb-${i}`}
                points={stagePts}
                stroke={stroke.color}
                strokeWidth={Math.max(1, stroke.width * wbScale)}
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
