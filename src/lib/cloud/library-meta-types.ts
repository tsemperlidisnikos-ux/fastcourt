import type {
  PlaybookSection,
  PracticePlannerData,
  GamePlan,
  PlayerHomeworkAssignment,
} from "@/types/library-meta";

export interface CloudOrganizerMeta {
  seasons: string[];
  teams: string[];
  series: string[];
  fieldTags: string[];
  playbooks: PlaybookSection[];
  practice: PracticePlannerData;
  gamePlans: GamePlan[];
  playerHomework: PlayerHomeworkAssignment[];
}

export const EMPTY_ORGANIZER_META: CloudOrganizerMeta = {
  seasons: ["Default"],
  teams: ["No Team"],
  series: [],
  fieldTags: [],
  playbooks: [],
  practice: { sessions: [] },
  gamePlans: [],
  playerHomework: [],
};
