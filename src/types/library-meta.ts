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
