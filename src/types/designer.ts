export type CourtType = "half" | "full";

export type CourtTemplate = "NCAA" | "NBA" | "HighSchool" | "FIBA";

export interface CourtViewSettings {
  template: CourtTemplate;
  angle: number;
  sidelinesFt: number;
  showBaskets: boolean;
  featureFilters: Record<string, boolean>;
  floorColor?: string;
  lineColor?: string;
  showWoodTiles?: boolean;
  woodTextureId?: string;
}



export type ActionType =

  | "cut"

  | "pass"

  | "dribble"

  | "screen"

  | "curl"

  | "handoff"

  | "shoot";



export type ActionTiming = "normal" | "optional" | "sync";



export type DesignerTool =

  | "select"

  | "offense"

  | "defense"

  | "ball"

  | "cone"

  | "text"

  | "label"

  | "flag"

  | "shadow"

  | "zone"

  | "line"

  | "shoot"

  | "delete"

  | "whiteboard";



export type ObjectKind =

  | "offense"

  | "defense"

  | "ball"

  | "cone"

  | "text"

  | "label"

  | "flag"

  | "shadow"

  | "zone";



export interface WhiteboardStroke {

  points: number[];

  color: string;

  width: number;

}



export interface CourtRect {

  x: number;

  y: number;

  width: number;

  height: number;

}



export interface DesignerObject {

  id: string;

  kind: ObjectKind;

  /** Normalized 0–1 within court floor */

  x: number;

  y: number;

  label?: string;

  /** Offense player with the ball */

  hasBall?: boolean;

  /** Normalized size for zone / shadow */

  w?: number;

  h?: number;

  shadowType?: "rect" | "circle" | "triangle" | "diamond";

  zoneType?: "paint" | "lane" | "threepoint" | "halfcourt";

  scaleX?: number;

  scaleY?: number;

  /** Defense marker: X label (mark) or rotatable guard wings (guard). */

  defenseStyle?: "mark" | "guard";

  /** Guard facing direction in degrees (0 = toward top of court). */

  rotation?: number;

}



export interface DesignerAction {

  id: string;

  type: ActionType;

  x1: number;

  y1: number;

  x2: number;

  y2: number;

  midX?: number;

  midY?: number;

  /** Symmetric curve controls at ⅓ and ⅔ of chord (norm coords) */

  c1x?: number;

  c1y?: number;

  c2x?: number;

  c2y?: number;

  points?: number[];

  strokeWidth?: number;

  color?: string;

  timing?: ActionTiming;

  /** Offense player id that initiated pass/dribble (multi-ball drills). */
  sourcePlayerId?: string;

  isFreehand?: boolean;

}



export interface DesignerFrame {

  id: string;

  name: string;

  objects: DesignerObject[];

  actions: DesignerAction[];

  /** Playback order — action ids */

  actionSequence?: string[];

  whiteboardStrokes?: WhiteboardStroke[];

  notes?: string;

  /** Show frame name overlay during animation playback. Default true when unset. */
  showTitleInAnimation?: boolean;

  /** Total playback duration for this frame's actions, in seconds. */
  animDurationSec?: number;

  /** Offensive read branch when defense disrupts the primary action. */
  readBranch?: FrameReadBranch;

}



export interface FrameReadBranch {

  /** Coach label e.g. "If ICE — Reject" */

  label: string;

  /** Defensive coverage that triggers this read (ice, switch, hedge…) */

  coverage?: string;

  /** Primary frame id this read branches from */

  parentFrameId?: string;

}



export interface PlayDocument {

  id: string;

  title: string;

  courtType: CourtType;

  courtView?: CourtViewSettings;

  frames: DesignerFrame[];

  animSpeed?: number;

  animPauseMs?: number;

}


