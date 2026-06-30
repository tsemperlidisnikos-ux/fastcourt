export interface HgCourtPoint {
  x: number;
  y: number;
}

export interface HgCourtLineElement {
  component: "CourtLine";
  feature: string;
  location: string[];
  props: {
    s: [number, number];
    e: [number, number];
  };
}

export interface HgPathCommandMove {
  cmd: "M";
  to: [number, number];
}

export interface HgPathCommandLine {
  cmd: "L";
  to: [number, number];
}

export interface HgPathCommandArc {
  cmd: "A";
  rx: number;
  ry: number;
  xAxisRotation: number;
  largeArcFlag: number;
  sweepFlag: number;
  to: [number, number];
}

export type HgPathCommand =
  | HgPathCommandMove
  | HgPathCommandLine
  | HgPathCommandArc;

export interface HgCourtPathElement {
  component: "CourtPath";
  feature: string;
  location: string[];
  props: {
    cmds: HgPathCommand[];
    strokeDasharray?: string;
  };
}

export interface HgCourtRectElement {
  component: "CourtRect";
  feature: string;
  location: string[];
  props: {
    pos: [number, number];
    size: [number, number];
    fill?: boolean;
  };
}

export type HgCourtElement =
  | HgCourtLineElement
  | HgCourtPathElement
  | HgCourtRectElement;

export interface CourtVectorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CourtVectorLine {
  points: HgCourtPoint[];
  dashed?: boolean;
}

export interface CourtVectorPath {
  d: string;
  fill: boolean;
  dashed?: boolean;
  dash?: number[];
  /** Multiplier on default line stroke (e.g. center line at 0.5). */
  strokeWidthScale?: number;
}

export interface CourtVectorGeometry {
  lengthFt: number;
  widthFt: number;
  rects: CourtVectorRect[];
  lines: CourtVectorLine[];
  paths: CourtVectorPath[];
}
