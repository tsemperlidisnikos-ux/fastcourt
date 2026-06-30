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
