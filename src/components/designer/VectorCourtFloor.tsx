"use client";

import { Group, Line, Circle, Path, Rect } from "react-konva";
import {
  courtHoopMarkersFt,
  getCourtHgTemplate,
} from "@/lib/designer/court-hg-templates";
import {
  buildWoodTileRects,
  woodFloorPatternScale,
} from "@/lib/designer/court-wood-tiles";
import {
  buildCourtVectorGeometry,
  hgPointToStage,
  strokeWidthForHgCourt,
} from "@/lib/designer/court-vector-geometry";
import { useCourtWoodTexture } from "@/lib/designer/use-court-wood-texture";
import { resolveCourtWoodTexture } from "@/lib/designer/court-assets";
import type { CourtRect, CourtTemplate, CourtType } from "@/types/designer";

export function VectorCourtFloor({
  court,
  courtType,
  template = "NCAA",
  floorColor,
  lineColor,
  featureFilters,
  showBaskets = true,
  showWoodTiles = false,
  woodFloorViaCss = false,
  woodTextureId,
  angle = 0,
  /** Full floor fill including OOB margins (Hoops Geek viewBox padding). */
  floorExtent,
  sidelinesFt = 0,
}: {
  court: CourtRect;
  courtType: CourtType;
  template?: CourtTemplate;
  floorColor: string;
  lineColor: string;
  featureFilters?: Record<string, boolean>;
  showBaskets?: boolean;
  showWoodTiles?: boolean;
  /** Wood floor is painted by `WoodCourtCssUnderlay` behind the Konva stage. */
  woodFloorViaCss?: boolean;
  woodTextureId?: string | null;
  angle?: number;
  floorExtent?: CourtRect;
  sidelinesFt?: number;
}) {
  const spec = getCourtHgTemplate(template);
  const thinCenterLine = sidelinesFt > 0;
  const geometry = buildCourtVectorGeometry(
    courtType,
    court.x,
    court.y,
    court.width,
    court.height,
    featureFilters,
    template,
    thinCenterLine,
  );
  const strokeWidth = strokeWidthForHgCourt(court.width, spec.widthFt);
  const dash = [strokeWidth * 3.2, strokeWidth * 2.4];
  const rimRadius = Math.max(strokeWidth * 1.35, (court.width / spec.widthFt) * 0.75);

  const filledPaths = geometry.paths.filter((p) => p.fill);
  const strokedPaths = geometry.paths.filter((p) => !p.fill);
  const filledRects = geometry.rects;

  const floorRect = floorExtent ?? court;

  const woodSpec = resolveCourtWoodTexture(woodTextureId);

  const renderKonvaWoodFloor = showWoodTiles && !woodFloorViaCss;
  const { image: woodTexture, failed: woodTextureFailed, loading: woodTextureLoading } =
    useCourtWoodTexture(renderKonvaWoodFloor, woodSpec.id);
  const useWoodTexture = renderKonvaWoodFloor && woodTexture && !woodTextureFailed;
  const woodPatternScale = useWoodTexture
    ? woodFloorPatternScale(
        woodTexture.width,
        Math.max(floorRect.width, floorRect.height),
      )
    : 1;

  const woodTiles =
    renderKonvaWoodFloor && !useWoodTexture && woodTextureFailed
      ? buildWoodTileRects(
          floorRect.x,
          floorRect.y,
          floorRect.width,
          floorRect.height,
          spec.widthFt,
          floorColor,
        )
      : null;

  const pivotX = court.x + court.width / 2;
  const pivotY = court.y + court.height / 2;

  const hoops = showBaskets
    ? courtHoopMarkersFt(template, courtType).map((marker) => {
        const rim = hgPointToStage(
          court.x,
          court.y,
          court.width,
          court.height,
          geometry.lengthFt,
          0,
          marker.rimY,
          spec.widthFt,
        );
        const boardLeft = hgPointToStage(
          court.x,
          court.y,
          court.width,
          court.height,
          geometry.lengthFt,
          -spec.backboardHalfWidthFt,
          marker.boardY,
          spec.widthFt,
        );
        const boardRight = hgPointToStage(
          court.x,
          court.y,
          court.width,
          court.height,
          geometry.lengthFt,
          spec.backboardHalfWidthFt,
          marker.boardY,
          spec.widthFt,
        );
        return { rim, boardLeft, boardRight, flip: marker.flip };
      })
    : [];

  const content = (
    <>
      {woodFloorViaCss ? null : useWoodTexture ? (
        <Rect
          x={floorRect.x}
          y={floorRect.y}
          width={floorRect.width}
          height={floorRect.height}
          fillPatternImage={woodTexture}
          fillPatternRepeat="repeat"
          fillPatternScaleX={woodPatternScale}
          fillPatternScaleY={woodPatternScale}
          fillPatternRotation={woodSpec.rotation}
        />
      ) : woodTiles ? (
        woodTiles.map((tile, index) => (
          <Rect
            key={`wood-${index}`}
            x={tile.x}
            y={tile.y}
            width={tile.width}
            height={tile.height}
            fill={tile.fill}
          />
        ))
      ) : !showWoodTiles ? (
        <Rect
          x={floorRect.x}
          y={floorRect.y}
          width={floorRect.width}
          height={floorRect.height}
          fill={floorColor}
        />
      ) : woodTextureLoading ? null : (
        <Rect
          x={floorRect.x}
          y={floorRect.y}
          width={floorRect.width}
          height={floorRect.height}
          fill={floorColor}
        />
      )}
      {filledPaths.map((path, index) => (
        <Path
          key={`paint-${index}`}
          data={path.d}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
        />
      ))}
      {filledRects.map((rect, index) => (
        <Rect
          key={`hash-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={lineColor}
        />
      ))}
      {strokedPaths.map((path, index) => (
        <Path
          key={`path-${index}`}
          data={path.d}
          stroke={lineColor}
          strokeWidth={strokeWidth * (path.strokeWidthScale ?? 1)}
          strokeScaleEnabled={false}
          dash={path.dash ?? (path.dashed ? dash : undefined)}
        />
      ))}
      {geometry.lines.map((segment, index) => (
        <Line
          key={`line-${index}`}
          points={[
            segment.points[0].x,
            segment.points[0].y,
            segment.points[1].x,
            segment.points[1].y,
          ]}
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeScaleEnabled={false}
          dash={segment.dashed ? dash : undefined}
        />
      ))}
      {hoops.map((hoop, index) => (
        <Group key={`hoop-${index}`}>
          <Line
            points={[
              hoop.boardLeft.x,
              hoop.boardLeft.y,
              hoop.boardRight.x,
              hoop.boardRight.y,
            ]}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeScaleEnabled={false}
          />
          <Circle
            x={hoop.rim.x}
            y={hoop.rim.y}
            radius={rimRadius}
            stroke={lineColor}
            strokeWidth={strokeWidth}
            strokeScaleEnabled={false}
          />
        </Group>
      ))}
    </>
  );

  if (!angle) {
    return (
      <Group listening={false}>
        {content}
      </Group>
    );
  }

  return (
    <Group
      listening={false}
      x={pivotX}
      y={pivotY}
      offsetX={court.width / 2}
      offsetY={court.height / 2}
      rotation={angle}
    >
      {content}
    </Group>
  );
}
