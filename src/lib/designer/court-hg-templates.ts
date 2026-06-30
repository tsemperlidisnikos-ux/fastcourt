import type { CourtTemplate, CourtType } from "@/types/designer";
import type { HgCourtElement } from "@/lib/designer/court-hg-types";
import courtHgElements from "@/lib/designer/court-hg-elements.json";

export interface CourtHgTemplateSpec {
  label: string;
  widthFt: number;
  fullLengthFt: number;
  /** Distance from baseline to hoop center (Hoops Geek). */
  hoopBaselineFt: number;
  /** Backboard line distance from baseline (HG geometry). */
  backboardBaselineFt: number;
  /** Half-width of backboard line in feet. */
  backboardHalfWidthFt: number;
  elements: HgCourtElement[];
}

/** Hoops Geek hoop / backboard offsets (feet from baseline). */
export const HG_BACKBOARD_BASELINE_FT = 4;
export const HG_BACKBOARD_HALF_WIDTH_FT = 3;

function deriveHgCourtBounds(elements: HgCourtElement[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    const points: Array<[number, number]> = [];
    if (el.component === "CourtLine") {
      points.push(el.props.s, el.props.e);
    } else if (el.component === "CourtRect") {
      points.push(el.props.pos, [
        el.props.pos[0] + el.props.size[0],
        el.props.pos[1] + el.props.size[1],
      ]);
    } else if (el.component === "CourtPath") {
      for (const cmd of el.props.cmds) points.push(cmd.to);
    }
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    widthFt: maxX - minX,
    fullLengthFt: maxY - minY,
    halfWidthFt: (maxX - minX) / 2,
  };
}

const elementsByTemplate = courtHgElements as Record<
  CourtTemplate,
  HgCourtElement[]
>;

function buildTemplateSpec(
  template: CourtTemplate,
  label: string,
  elements: HgCourtElement[],
): CourtHgTemplateSpec {
  const bounds = deriveHgCourtBounds(elements);
  return {
    label,
    widthFt: bounds.widthFt,
    fullLengthFt: bounds.fullLengthFt,
    hoopBaselineFt: 5.25,
    backboardBaselineFt: HG_BACKBOARD_BASELINE_FT,
    backboardHalfWidthFt: HG_BACKBOARD_HALF_WIDTH_FT,
    elements,
  };
}

export const COURT_HG_TEMPLATE_SPECS: Record<CourtTemplate, CourtHgTemplateSpec> = {
  NCAA: buildTemplateSpec("NCAA", "NCAA", elementsByTemplate.NCAA),
  NBA: buildTemplateSpec("NBA", "NBA", elementsByTemplate.NBA),
  FIBA: buildTemplateSpec("FIBA", "FIBA", elementsByTemplate.FIBA),
  HighSchool: buildTemplateSpec("HighSchool", "High School", elementsByTemplate.HighSchool),
};

export function getCourtHgTemplate(template: CourtTemplate): CourtHgTemplateSpec {
  return COURT_HG_TEMPLATE_SPECS[template] ?? COURT_HG_TEMPLATE_SPECS.NCAA;
}

export function courtHalfLengthFt(template: CourtTemplate) {
  return getCourtHgTemplate(template).fullLengthFt / 2;
}

export function courtFullLengthFt(template: CourtTemplate) {
  return getCourtHgTemplate(template).fullLengthFt;
}

export function courtWidthFt(template: CourtTemplate) {
  return getCourtHgTemplate(template).widthFt;
}

export function courtHoopMarkersFt(
  template: CourtTemplate,
  courtType: CourtType,
) {
  const spec = getCourtHgTemplate(template);
  const nearRim = spec.hoopBaselineFt;
  const farRim = spec.fullLengthFt - spec.hoopBaselineFt;
  const nearBoard = spec.backboardBaselineFt;
  const farBoard = spec.fullLengthFt - spec.backboardBaselineFt;

  if (courtType === "full") {
    return [
      { rimY: nearRim, boardY: nearBoard, flip: false },
      { rimY: farRim, boardY: farBoard, flip: true },
    ];
  }
  return [{ rimY: nearRim, boardY: nearBoard, flip: false }];
}

/** @deprecated use courtHoopMarkersFt */
export function courtHoopPositionsFt(
  template: CourtTemplate,
  courtType: CourtType,
) {
  return courtHoopMarkersFt(template, courtType).map((m) => m.rimY);
}

export function getCourtAspect(template: CourtTemplate, courtType: CourtType) {
  const spec = getCourtHgTemplate(template);
  const lengthFt =
    courtType === "full" ? spec.fullLengthFt : spec.fullLengthFt / 2;
  /** width/length so court pixels use uniform feet-per-pixel (matches FastDraw FD_*_ASPECT). */
  return spec.widthFt / lengthFt;
}
