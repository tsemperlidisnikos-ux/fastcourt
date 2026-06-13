"use client";

import { create } from "zustand";
import type { PlaybookSection } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type { PlayerShareSendContext } from "@/types/player-roster";
import type { SharePracticeItem } from "@/lib/share/share-link";

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
}

interface ShareState {
  portalOpen: boolean;
  playerShareSession: PlayerShareSession | null;
  practiceShareSession: PracticeShareSession | null;
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
  openRosterModal: (team?: string) => void;
  closeRosterModal: () => void;
  openSendModal: (context: PlayerShareSendContext) => void;
  closeSendModal: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  portalOpen: false,
  playerShareSession: null,
  practiceShareSession: null,
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
