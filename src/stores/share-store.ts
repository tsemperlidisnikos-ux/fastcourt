"use client";

import { create } from "zustand";
import type { PlaybookSection } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type { PlayerShareSendContext } from "@/types/player-roster";
import type { SharePracticeItem, ShareGamePlanEntry } from "@/lib/share/share-link";

export interface PlayerShareSession {
  section: Pick<PlaybookSection, "name" | "team" | "subtitle">;
  plays: StoredPlay[];
  playerView: boolean;
}

export interface PracticeShareSession {
  session: {
    title: string;
    date: string;
    team: string;
    notes?: string;
  };
  items: SharePracticeItem[];
  stageRef: { width: number; height: number };
  sessionId?: string;
}

export interface GamePlanShareSession {
  plan: {
    title: string;
    opponent: string;
    gameDate: string;
    team: string;
    location?: string;
    homeAway?: string;
    scoutingNotes?: string;
    postGameNotes?: string;
  };
  entries: ShareGamePlanEntry[];
  stageRef: { width: number; height: number };
}

export interface HomeworkShareSession {
  homeworkId?: string;
  player?: {
    id: string;
    name: string;
    token: string;
  };
  assignment: {
    title: string;
    opponent: string;
    gameDate: string;
    dueDate: string;
    team: string;
    notes?: string;
  };
  entries: ShareGamePlanEntry[];
  stageRef: { width: number; height: number };
}

export interface GameDayShareSession {
  planId: string;
  plan: {
    title: string;
    opponent: string;
    gameDate: string;
    team: string;
    location?: string;
    homeAway?: string;
    scoutingNotes?: string;
    timeoutCues?: import("@/types/library-meta").GamePlanTimeoutCue[];
  };
  entries: ShareGamePlanEntry[];
  activeCategoryId?: import("@/types/library-meta").GamePlanCategoryId;
  syncToken?: string;
  stageRef: { width: number; height: number };
}

interface ShareState {
  portalOpen: boolean;
  playerShareSession: PlayerShareSession | null;
  practiceShareSession: PracticeShareSession | null;
  gamePlanShareSession: GamePlanShareSession | null;
  homeworkShareSession: HomeworkShareSession | null;
  gameDayShareSession: GameDayShareSession | null;
  rosterModalOpen: boolean;
  rosterModalTeam: string;
  sendModalOpen: boolean;
  sendContext: PlayerShareSendContext | null;
  openPortal: () => void;
  closePortal: () => void;
  setPlayerShareSession: (session: PlayerShareSession | null) => void;
  clearPlayerShareSession: () => void;
  setPracticeShareSession: (session: PracticeShareSession | null) => void;
  clearPracticeShareSession: () => void;
  setGamePlanShareSession: (session: GamePlanShareSession | null) => void;
  clearGamePlanShareSession: () => void;
  setHomeworkShareSession: (session: HomeworkShareSession | null) => void;
  clearHomeworkShareSession: () => void;
  setGameDayShareSession: (session: GameDayShareSession | null) => void;
  clearGameDayShareSession: () => void;
  openRosterModal: (team?: string) => void;
  closeRosterModal: () => void;
  openSendModal: (context: PlayerShareSendContext) => void;
  closeSendModal: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  portalOpen: false,
  playerShareSession: null,
  practiceShareSession: null,
  gamePlanShareSession: null,
  homeworkShareSession: null,
  gameDayShareSession: null,
  rosterModalOpen: false,
  rosterModalTeam: "No Team",
  sendModalOpen: false,
  sendContext: null,
  openPortal: () => set({ portalOpen: true }),
  closePortal: () => set({ portalOpen: false }),
  setPlayerShareSession: (session) =>
    set({ playerShareSession: session, portalOpen: true }),
  clearPlayerShareSession: () => set({ playerShareSession: null }),
  setPracticeShareSession: (session) => set({ practiceShareSession: session }),
  clearPracticeShareSession: () => set({ practiceShareSession: null }),
  setGamePlanShareSession: (session) => set({ gamePlanShareSession: session }),
  clearGamePlanShareSession: () => set({ gamePlanShareSession: null }),
  setHomeworkShareSession: (session) => set({ homeworkShareSession: session }),
  clearHomeworkShareSession: () => set({ homeworkShareSession: null }),
  setGameDayShareSession: (session) => set({ gameDayShareSession: session }),
  clearGameDayShareSession: () => set({ gameDayShareSession: null }),
  openRosterModal: (team) =>
    set({
      rosterModalOpen: true,
      rosterModalTeam: String(team || "").trim(),
    }),
  closeRosterModal: () => set({ rosterModalOpen: false }),
  openSendModal: (context) =>
    set({ sendModalOpen: true, sendContext: context }),
  closeSendModal: () => set({ sendModalOpen: false, sendContext: null }),
}));
