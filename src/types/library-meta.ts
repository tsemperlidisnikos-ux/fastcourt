export interface PlaybookSection {
  id: string;
  name: string;
  team: string;
  subtitle?: string;
  playRefs: string[];
  updatedAt: string;
}

export interface PracticeSessionItem {
  id: string;
  playId?: string;
  cueLabel?: string;
  durationMin: number;
  notes?: string;
  videoUrl?: string;
}

export interface PracticeSession {
  id: string;
  date: string;
  title: string;
  team: string;
  notes?: string;
  liveNotes?: string;
  items: PracticeSessionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticePlannerData {
  sessions: PracticeSession[];
}

export interface PracticeTemplateItemSpec {
  playId?: string | null;
  cueLabel?: string;
  matchNames?: string[];
  durationMin: number;
  notes?: string;
}

export interface PracticeTemplate {
  id: string;
  name: string;
  title?: string;
  notes?: string;
  team?: string;
  builtin?: boolean;
  items: PracticeTemplateItemSpec[];
  createdAt?: string;
}

export type FieldsSubTab = "seasons" | "teams" | "series" | "tags";

export type GamePlanCategoryId =
  | "ato"
  | "blob"
  | "slob"
  | "zone"
  | "press"
  | "halfcourt"
  | "transition"
  | "defense"
  | "special"
  | "custom";

export type GamePlanStatus = "draft" | "ready" | "archived";

export type GamePlanHomeAway = "home" | "away" | "neutral";

export interface GamePlanEntry {
  id: string;
  categoryId: GamePlanCategoryId;
  label?: string;
  callName?: string;
  playId?: string;
  notes?: string;
}

/** Opponent scouting tag on the game plan board (e.g. "They run BOB"). */
export type OpponentTendencyKind =
  | "blob"
  | "slob"
  | "ato"
  | "zone"
  | "press"
  | "transition"
  | "halfcourt"
  | "other";

export interface OpponentTendency {
  id: string;
  kind: OpponentTendencyKind;
  label: string;
  notes?: string;
  filmSessionId?: string;
  /** Video timestamp (seconds) when tagged from Film Room. */
  filmTimestamp?: number;
  createdAt: string;
}

/** AI / film-room counter saved for Game Day & timeout huddles. */
export interface GamePlanTimeoutCue {
  id: string;
  title: string;
  detail: string;
  coverage: string;
  targetsPattern?: string;
  trigger?: string;
  ballHandlerRule?: string;
  screenerRule?: string;
  weakPoint?: string;
  priority?: "high" | "medium" | "low";
  sourceFilmSessionId?: string;
  sourceFilmTimestamp?: number;
  createdAt: string;
}

export interface GamePlan {
  id: string;
  title: string;
  opponent: string;
  gameDate: string;
  team: string;
  location?: string;
  homeAway?: GamePlanHomeAway;
  scoutingNotes?: string;
  postGameNotes?: string;
  entries: GamePlanEntry[];
  /** Scout tags for what the opponent runs; drives defensive play suggestions. */
  opponentBoard?: OpponentTendency[];
  /** Counter calls from Film Room AI — shown in Game Day / timeout mode. */
  timeoutCues?: GamePlanTimeoutCue[];
  status: GamePlanStatus;
  gameDay?: {
    activeCategoryId?: GamePlanCategoryId;
    updatedAt?: string;
    syncToken?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type PlayerHomeworkStatus = "open" | "closed";

export interface PlayerHomeworkPlayerStatus {
  studied: boolean;
  studiedAt?: string;
  openedAt?: string;
  source?: "coach" | "player";
}

export interface PlayerHomeworkAssignment {
  id: string;
  gamePlanId: string;
  title: string;
  opponent: string;
  gameDate: string;
  dueDate: string;
  team: string;
  notes?: string;
  playIds: string[];
  playerTokens?: Record<string, string>;
  playerStatus: Record<string, PlayerHomeworkPlayerStatus>;
  status: PlayerHomeworkStatus;
  createdAt: string;
  updatedAt: string;
}
