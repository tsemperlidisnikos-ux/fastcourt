import type {
  ActionType,
  DesignerAction,
  DesignerFrame,
  DesignerObject,
  ObjectKind,
} from "@/types/designer";
import { mergeCourtViewSettings } from "@/lib/designer/court-view-settings";
import type { LibraryItemType, PlayDetailsValues, StoredPlay } from "@/types/library";
import {
  canPlaceRosterPlayer,
  nextAvailableJersey,
  normalizeRosterLabel,
} from "@/lib/designer/player-limits";
import { DEFAULT_PLAYBACK_SPEED } from "@/lib/designer/animation-timing";
import { createBlankPlay } from "@/lib/designer/play-factory";

interface LegacyPlayer {
  number?: string | number;
  num?: string | number;
  x?: number;
  y?: number;
  nx?: number;
  ny?: number;
  isDefense?: boolean;
  hasBall?: boolean;
}

interface LegacyArrow {
  actionType?: string;
  points?: number[];
  _curveControls?: number[];
  _startX?: number;
  _startY?: number;
  _endX?: number;
  _endY?: number;
  _midX?: number;
  _midY?: number;
  strokeWidth?: number;
}

interface LegacyHandoffControls {
  _startX?: number;
  _startY?: number;
  _endX?: number;
  _endY?: number;
  _midX?: number;
  _midY?: number;
}

interface LegacyScreenAction {
  type?: string;
  isScreen?: boolean;
  isHandoff?: boolean;
  handoffControls?: LegacyHandoffControls;
  children?: Array<{
    class?: string;
    points?: number[];
    strokeWidth?: number;
  }>;
}

interface LegacyFrame {
  name?: string;
  players?: LegacyPlayer[];
  arrows?: LegacyArrow[];
  actions?: LegacyScreenAction[];
}

interface LegacyPlay {
  id?: string;
  name?: string;
  courtType?: "half" | "full";
  category?: string;
  team?: string;
  season?: string;
  series?: string;
  state?: { frames?: LegacyFrame[] };
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function playerToObject(player: LegacyPlayer): DesignerObject | null {
  const x = player.x ?? player.nx;
  const y = player.y ?? player.ny;
  if (typeof x !== "number" || typeof y !== "number") return null;

  const labelRaw = String(player.number ?? player.num ?? "");
  const kind: ObjectKind = player.isDefense ? "defense" : "offense";
  const label = normalizeRosterLabel(kind, labelRaw);

  return {
    id: newId("obj"),
    kind,
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    label: label || undefined,
  };
}

const VALID_ACTION_TYPES = new Set<ActionType>([
  "cut",
  "pass",
  "dribble",
  "screen",
  "curl",
  "handoff",
  "shoot",
]);

function normCoord(value: number) {
  return Math.min(1, Math.max(0, value));
}

function legacyArrowToAction(arrow: LegacyArrow): DesignerAction | null {
  const type = VALID_ACTION_TYPES.has(arrow.actionType as ActionType)
    ? (arrow.actionType as ActionType)
    : "cut";

  let x1 = arrow._startX;
  let y1 = arrow._startY;
  let x2 = arrow._endX;
  let y2 = arrow._endY;

  if (
    (x1 == null || y1 == null || x2 == null || y2 == null) &&
    arrow.points &&
    arrow.points.length >= 4
  ) {
    x1 = arrow.points[0];
    y1 = arrow.points[1];
    x2 = arrow.points[arrow.points.length - 2];
    y2 = arrow.points[arrow.points.length - 1];
  }

  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  ) {
    return null;
  }

  const points =
    arrow.points && arrow.points.length >= 4
      ? arrow.points.map(normCoord)
      : undefined;

  const controls =
    arrow._curveControls?.length === 8
      ? arrow._curveControls
      : arrow.points?.length === 8
        ? arrow.points
        : null;

  const action: DesignerAction = {
    id: newId("act"),
    type,
    x1: normCoord(controls ? controls[0] : x1),
    y1: normCoord(controls ? controls[1] : y1),
    x2: normCoord(controls ? controls[6] : x2),
    y2: normCoord(controls ? controls[7] : y2),
    midX: arrow._midX != null ? normCoord(arrow._midX) : (normCoord(x1) + normCoord(x2)) / 2,
    midY: arrow._midY != null ? normCoord(arrow._midY) : (normCoord(y1) + normCoord(y2)) / 2,
    c1x: controls ? normCoord(controls[2]) : undefined,
    c1y: controls ? normCoord(controls[3]) : undefined,
    c2x: controls ? normCoord(controls[4]) : undefined,
    c2y: controls ? normCoord(controls[5]) : undefined,
    points: controls ? undefined : points,
    strokeWidth: arrow.strokeWidth,
    timing: "normal",
    isFreehand: !controls && points != null && points.length > 4,
  };
  if (controls) {
    action.midX = (action.c1x! + action.c2x!) / 2;
    action.midY = (action.c1y! + action.c2y!) / 2;
  }
  return action;
}

function legacyGroupedActionToDesigner(action: LegacyScreenAction): DesignerAction | null {
  if (action.isHandoff && action.handoffControls) {
    const hc = action.handoffControls;
    const x1 = hc._startX;
    const y1 = hc._startY;
    const x2 = hc._endX;
    const y2 = hc._endY;
    if (
      typeof x1 !== "number" ||
      typeof y1 !== "number" ||
      typeof x2 !== "number" ||
      typeof y2 !== "number"
    ) {
      return null;
    }
    const nx1 = normCoord(x1);
    const ny1 = normCoord(y1);
    const nx2 = normCoord(x2);
    const ny2 = normCoord(y2);
    return {
      id: newId("act"),
      type: "handoff",
      x1: nx1,
      y1: ny1,
      x2: nx2,
      y2: ny2,
      midX:
        hc._midX != null ? normCoord(hc._midX) : (nx1 + nx2) / 2,
      midY:
        hc._midY != null ? normCoord(hc._midY) : (ny1 + ny2) / 2,
      strokeWidth: 4,
      timing: "normal",
    };
  }

  const mainLine = (action.children ?? []).find(
    (c) => c.class === "Line" && (c.points?.length ?? 0) >= 4,
  );
  if (!mainLine?.points || mainLine.points.length < 4) return null;

  const pts = mainLine.points;
  const controls = pts.length === 8 ? pts : null;
  const x1 = controls ? pts[0] : pts[0];
  const y1 = controls ? pts[1] : pts[1];
  const x2 = controls ? pts[6] : pts[pts.length - 2];
  const y2 = controls ? pts[7] : pts[pts.length - 1];
  if (
    typeof x1 !== "number" ||
    typeof y1 !== "number" ||
    typeof x2 !== "number" ||
    typeof y2 !== "number"
  ) {
    return null;
  }

  const type: ActionType = action.isHandoff
    ? "handoff"
    : action.isScreen
      ? "screen"
      : "screen";

  const designer: DesignerAction = {
    id: newId("act"),
    type,
    x1: normCoord(x1),
    y1: normCoord(y1),
    x2: normCoord(x2),
    y2: normCoord(y2),
    midX: (normCoord(x1) + normCoord(x2)) / 2,
    midY: (normCoord(y1) + normCoord(y2)) / 2,
    points: controls ? undefined : pts.map(normCoord),
    strokeWidth: mainLine.strokeWidth,
  };
  if (controls) {
    designer.c1x = normCoord(controls[2]);
    designer.c1y = normCoord(controls[3]);
    designer.c2x = normCoord(controls[4]);
    designer.c2y = normCoord(controls[5]);
    designer.midX = (designer.c1x + designer.c2x) / 2;
    designer.midY = (designer.c1y + designer.c2y) / 2;
  }
  return designer;
}

function legacyFrameToDesigner(frame: LegacyFrame, index: number): DesignerFrame {
  const objects: DesignerObject[] = [];
  const actions: DesignerAction[] = [];

  for (const player of frame.players ?? []) {
    const kind: ObjectKind = player.isDefense ? "defense" : "offense";
    if (!canPlaceRosterPlayer(objects, kind)) continue;

    const obj = playerToObject(player);
    if (!obj) continue;

    const label = nextAvailableJersey(objects, kind);
    if (!label) continue;

    objects.push({
      ...obj,
      kind,
      label,
      hasBall: !player.isDefense && !!player.hasBall,
    });
  }

  for (const arrow of frame.arrows ?? []) {
    const action = legacyArrowToAction(arrow);
    if (action) actions.push(action);
  }
  for (const grouped of frame.actions ?? []) {
    const action = legacyGroupedActionToDesigner(grouped);
    if (action) actions.push(action);
  }

  return {
    id: newId("frame"),
    name: frame.name?.trim() || `Frame ${index + 1}`,
    objects,
    actions,
    actionSequence: actions.map((a) => a.id),
  };
}

export function inferLibraryType(name: string, category = ""): LibraryItemType {
  const text = `${name} ${category}`.toLowerCase();
  if (/\bdrill\b/.test(text)) return "drill";
  if (/\bplaybook\b/.test(text)) return "playbook";
  return "play";
}

export function legacyPlayToStored(play: LegacyPlay, source: StoredPlay["source"] = "fdb-import"): StoredPlay {
  const now = new Date().toISOString();
  const frames =
    play.state?.frames?.length
      ? play.state.frames.map(legacyFrameToDesigner)
      : createBlankPlay(play.name || "Imported play").frames;

  const title = (play.name || "Imported play").trim();
  const team = (play.team || "").trim() || "No Team";
  const season = (play.season || "").trim() || "Default";
  const series = (play.series || play.category || "").trim();
  const tags = [team, series].filter(Boolean);

  return {
    id: play.id || newId("play"),
    title,
    courtType: play.courtType === "full" ? "full" : "half",
    frames,
    animSpeed: DEFAULT_PLAYBACK_SPEED,
    animPauseMs: 800,
    type: inferLibraryType(title, play.category),
    season,
    team,
    series,
    tags,
    createdAt: now,
    updatedAt: now,
    source,
  };
}

/** Apply Play Details modal values onto a full stored play document. */
export function patchStoredPlayFromDetails(
  play: StoredPlay,
  details: PlayDetailsValues,
): StoredPlay {
  const now = new Date().toISOString();
  return {
    ...play,
    title: details.title,
    type: details.type,
    team: details.team,
    series: details.series,
    tags: details.tags,
    courtType: details.courtType,
    courtView: mergeCourtViewSettings(details.courtView ?? play.courtView),
    season: details.season,
    playNotes: details.playNotes || undefined,
    videoUrl: details.videoUrl || undefined,
    defenseCounter: details.defenseCounter?.enabled
      ? {
          enabled: true,
          coverages: details.defenseCounter.coverages ?? [],
          vsPatterns: details.defenseCounter.vsPatterns ?? [],
          notes: details.defenseCounter.notes?.trim() || undefined,
        }
      : undefined,
    updatedAt: now,
  };
}

export function storedPlayToLibraryItem(play: StoredPlay) {
  return {
    id: play.id,
    title: play.title,
    type: play.type,
    season: play.season,
    team: play.team,
    series: play.series,
    tags: play.tags,
    frameCount: play.frames.length,
    updatedAt: play.updatedAt,
    favorite: play.favorite,
    defenseCounter: play.defenseCounter?.enabled
      ? {
          enabled: true as const,
          coverages: play.defenseCounter.coverages ?? [],
          vsPatterns: play.defenseCounter.vsPatterns ?? [],
        }
      : undefined,
    source: play.source,
    lazyPending: play.lazyPending,
    ownerUserId: play.ownerUserId,
    ownerEmail: play.ownerEmail,
    ownerDisplayName: play.ownerDisplayName,
  };
}

export function blankStoredPlay(title = "New play"): StoredPlay {
  const base = createBlankPlay(title);
  const now = new Date().toISOString();
  return {
    ...base,
    type: "play",
    season: "Default",
    team: "No Team",
    series: "",
    tags: [],
    createdAt: now,
    updatedAt: now,
    source: "manual",
  };
}
