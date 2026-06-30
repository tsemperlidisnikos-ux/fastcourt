import {
  getCourtHgTemplate,
  courtFullLengthFt,
  courtHalfLengthFt,
  courtWidthFt,
} from "@/lib/designer/court-hg-templates";
import type {
  CourtVectorGeometry,
  CourtVectorLine,
  CourtVectorPath,
  CourtVectorRect,
  HgCourtElement,
  HgCourtPoint,
  HgPathCommand,
} from "@/lib/designer/court-hg-types";
import type { CourtTemplate, CourtType } from "@/types/designer";

/** NCAA court width — legacy alias for sideline math defaults. */
export const NCAA_COURT_WIDTH_FT = courtWidthFt("NCAA");
export const NCAA_FULL_LENGTH_FT = courtFullLengthFt("NCAA");
export const NCAA_HALF_LENGTH_FT = courtHalfLengthFt("NCAA");

export type {
  CourtVectorGeometry,
  CourtVectorLine,
  CourtVectorPath,
  CourtVectorRect,
  HgCourtElement,
  HgCourtPoint,
  HgPathCommand,
} from "@/lib/designer/court-hg-types";

export function courtLengthFt(
  courtType: CourtType,
  template: CourtTemplate = "NCAA",
) {
  return courtType === "full"
    ? courtFullLengthFt(template)
    : courtHalfLengthFt(template);
}

export function filterHgElements(
  courtType: CourtType,
  elements: HgCourtElement[],
  featureFilters?: Record<string, boolean>,
) {
  let filtered =
    courtType === "full"
      ? elements
      : elements.filter((el) => el.location.includes("frontcourt"));
  if (featureFilters) {
    filtered = filtered.filter((el) => {
      if (!el.feature) return true;
      return featureFilters[el.feature] !== false;
    });
  }
  return filtered;
}

function hgToNorm(
  x: number,
  y: number,
  widthFt: number,
  lengthFt: number,
): HgCourtPoint {
  return {
    x: (x + widthFt / 2) / widthFt,
    y: y / lengthFt,
  };
}

export function hgPointToStage(
  courtX: number,
  courtY: number,
  courtW: number,
  courtH: number,
  lengthFt: number,
  x: number,
  y: number,
  widthFt: number = NCAA_COURT_WIDTH_FT,
) {
  const norm = hgToNorm(x, y, widthFt, lengthFt);
  return {
    x: courtX + norm.x * courtW,
    y: courtY + norm.y * courtH,
  };
}

function pathCommandsToSvg(
  cmds: HgPathCommand[],
  courtX: number,
  courtY: number,
  courtW: number,
  courtH: number,
  lengthFt: number,
  widthFt: number,
) {
  const scaleX = courtW / widthFt;
  const scaleY = courtH / lengthFt;
  let d = "";

  for (const cmd of cmds) {
    const p = hgPointToStage(
      courtX,
      courtY,
      courtW,
      courtH,
      lengthFt,
      cmd.to[0],
      cmd.to[1],
      widthFt,
    );
    if (cmd.cmd === "M") {
      d += `M ${p.x} ${p.y}`;
    } else if (cmd.cmd === "L") {
      d += ` L ${p.x} ${p.y}`;
    } else if (cmd.cmd === "A") {
      const rx = cmd.rx * scaleX;
      const ry = cmd.ry * scaleY;
      d += ` A ${rx} ${ry} ${cmd.xAxisRotation} ${cmd.largeArcFlag} ${cmd.sweepFlag} ${p.x} ${p.y}`;
    }
  }

  return d;
}

export function strokeWidthForHgCourt(courtW: number, widthFt: number = NCAA_COURT_WIDTH_FT) {
  /** Hoops Geek default court.strokeWidth = 0.3 ft */
  return Math.max(1.1, (courtW / widthFt) * 0.3);
}

export function buildCourtVectorGeometry(
  courtType: CourtType,
  courtX: number,
  courtY: number,
  courtW: number,
  courtH: number,
  featureFilters?: Record<string, boolean>,
  template: CourtTemplate = "NCAA",
  thinCenterLine = false,
): CourtVectorGeometry {
  const spec = getCourtHgTemplate(template);
  const lengthFt = courtLengthFt(courtType, template);
  const widthFt = spec.widthFt;
  const elements = filterHgElements(courtType, spec.elements, featureFilters);

  const rects: CourtVectorRect[] = [];
  const lines: CourtVectorLine[] = [];
  const paths: CourtVectorPath[] = [];

  for (const el of elements) {
    if (el.component === "CourtLine") {
      const start = hgPointToStage(
        courtX,
        courtY,
        courtW,
        courtH,
        lengthFt,
        el.props.s[0],
        el.props.s[1],
        widthFt,
      );
      const end = hgPointToStage(
        courtX,
        courtY,
        courtW,
        courtH,
        lengthFt,
        el.props.e[0],
        el.props.e[1],
        widthFt,
      );
      lines.push({
        points: [start, end],
      });
      continue;
    }

    if (el.component === "CourtRect" && el.props.fill) {
      const topLeft = hgPointToStage(
        courtX,
        courtY,
        courtW,
        courtH,
        lengthFt,
        el.props.pos[0],
        el.props.pos[1],
        widthFt,
      );
      const sizeNorm = hgToNorm(
        el.props.pos[0] + el.props.size[0],
        el.props.pos[1] + el.props.size[1],
        widthFt,
        lengthFt,
      );
      const originNorm = hgToNorm(el.props.pos[0], el.props.pos[1], widthFt, lengthFt);
      rects.push({
        x: topLeft.x,
        y: topLeft.y,
        width: (sizeNorm.x - originNorm.x) * courtW,
        height: (sizeNorm.y - originNorm.y) * courtH,
      });
      continue;
    }

    if (el.component === "CourtPath") {
      // Inner free-throw semi-circle (dashed in HG source) — omit; keep outer arc only.
      if (el.feature === "freeThrowArc" && el.props.strokeDasharray) {
        continue;
      }
      paths.push({
        d: pathCommandsToSvg(
          el.props.cmds,
          courtX,
          courtY,
          courtW,
          courtH,
          lengthFt,
          widthFt,
        ),
        fill: el.feature === "paintedArea",
        strokeWidthScale:
          thinCenterLine && el.feature === "centerLine" ? 0.5 : undefined,
      });
    }
  }

  return { lengthFt, widthFt, rects, lines, paths };
}

export function countHgElements(
  courtType: CourtType,
  featureFilters?: Record<string, boolean>,
  template: CourtTemplate = "NCAA",
) {
  const spec = getCourtHgTemplate(template);
  return filterHgElements(courtType, spec.elements, featureFilters).length;
}
