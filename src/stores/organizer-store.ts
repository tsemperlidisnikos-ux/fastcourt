"use client";

import { create } from "zustand";
import {
  getCustomFieldTags,
  getCustomSeasons,
  getCustomSeries,
  getCustomTeams,
  getPlaybookSections,
  getPracticeData,
  setCustomFieldTags,
  setCustomSeasons,
  setCustomSeries,
  setCustomTeams,
  setPlaybookSections,
  setPracticeData,
} from "@/lib/library/meta";
import { listStoredPlays } from "@/lib/library/idb";
import {
  defaultPracticeItemDuration,
  newPracticeItemId,
  normalizePracticeSession,
} from "@/lib/practice/practice-items";
import { sessionFromTemplate } from "@/lib/practice/templates";
import type { StoredPlay } from "@/types/library";
import type {
  FieldsSubTab,
  PlaybookSection,
  PracticeSession,
  PracticeSessionItem,
  PracticeTemplate,
} from "@/types/library-meta";

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

interface OrganizerState {
  seasons: string[];
  teams: string[];
  series: string[];
  fieldTags: string[];
  playbooks: PlaybookSection[];
  practiceSessions: PracticeSession[];
  plays: StoredPlay[];
  hydrated: boolean;
  loadMeta: () => Promise<void>;
  addField: (tab: FieldsSubTab, name: string) => Promise<boolean>;
  deleteFields: (tab: FieldsSubTab, names: string[]) => Promise<void>;
  countPlaysForField: (tab: FieldsSubTab, name: string) => number;
  createPlaybook: (name: string, team: string) => Promise<PlaybookSection>;
  updatePlaybook: (id: string, patch: Partial<PlaybookSection>) => Promise<void>;
  deletePlaybook: (id: string) => Promise<void>;
  addPlayToPlaybook: (playbookId: string, playId: string) => Promise<void>;
  reorderPlaybookPlays: (
    playbookId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;
  removePlayFromPlaybook: (playbookId: string, playId: string) => Promise<void>;
  resolvePlaybookPlays: (section: PlaybookSection) => StoredPlay[];
  createPracticeSession: () => Promise<PracticeSession>;
  createPracticeSessionFromTemplate: (
    template: PracticeTemplate,
  ) => Promise<PracticeSession>;
  updatePracticeSession: (
    id: string,
    patch: Partial<PracticeSession>,
  ) => Promise<void>;
  deletePracticeSession: (id: string) => Promise<void>;
  addPracticeItems: (sessionId: string, playIds: string[]) => Promise<void>;
  addPracticeCueBlock: (
    sessionId: string,
    cueLabel: string,
    durationMin?: number,
  ) => Promise<void>;
  updatePracticeItem: (
    sessionId: string,
    itemId: string,
    patch: Partial<PracticeSessionItem>,
  ) => Promise<void>;
  removePracticeItem: (sessionId: string, itemId: string) => Promise<void>;
  reorderPracticeItems: (
    sessionId: string,
    fromIndex: number,
    toIndex: number,
  ) => Promise<void>;
  movePracticeItem: (
    sessionId: string,
    itemId: string,
    direction: "up" | "down",
  ) => Promise<void>;
}

function normalizeName(name: string) {
  return name.trim();
}

export const useOrganizerStore = create<OrganizerState>((set, get) => ({
  seasons: ["Default"],
  teams: ["No Team"],
  series: [],
  fieldTags: [],
  playbooks: [],
  practiceSessions: [],
  plays: [],
  hydrated: false,

  loadMeta: async () => {
    const [seasons, teams, series, fieldTags, playbooks, practice, plays] =
      await Promise.all([
        getCustomSeasons(),
        getCustomTeams(),
        getCustomSeries(),
        getCustomFieldTags(),
        getPlaybookSections(),
        getPracticeData(),
        listStoredPlays(),
      ]);
    set({
      seasons,
      teams,
      series,
      fieldTags,
      playbooks,
      practiceSessions: practice.sessions.map(normalizePracticeSession),
      plays,
      hydrated: true,
    });
  },

  countPlaysForField: (tab, name) => {
    const n = name.toLowerCase();
    return get().plays.filter((p) => {
      if (tab === "seasons") return (p.season || "").toLowerCase() === n;
      if (tab === "teams") return (p.team || "").toLowerCase() === n;
      if (tab === "series") return (p.series || "").toLowerCase() === n;
      return (p.tags || []).some((t) => t.toLowerCase() === n);
    }).length;
  },

  addField: async (tab, rawName) => {
    const name = normalizeName(rawName);
    if (!name) return false;
    const state = get();
    const listKey =
      tab === "seasons"
        ? "seasons"
        : tab === "teams"
          ? "teams"
          : tab === "series"
            ? "series"
            : "fieldTags";
    const list = state[listKey];
    if (list.some((v) => v.toLowerCase() === name.toLowerCase())) return false;
    const next = [...list, name].sort((a, b) => a.localeCompare(b));
    if (tab === "seasons") await setCustomSeasons(next);
    else if (tab === "teams") await setCustomTeams(next);
    else if (tab === "series") await setCustomSeries(next);
    else await setCustomFieldTags(next);
    set({ [listKey]: next } as Partial<OrganizerState>);
    return true;
  },

  deleteFields: async (tab, names) => {
    const lower = new Set(names.map((n) => n.toLowerCase()));
    const state = get();
    if (tab === "seasons") {
      const next = state.seasons.filter((v) => !lower.has(v.toLowerCase()));
      await setCustomSeasons(next.length ? next : ["Default"]);
      set({ seasons: next.length ? next : ["Default"] });
    } else if (tab === "teams") {
      const next = state.teams.filter((v) => !lower.has(v.toLowerCase()));
      await setCustomTeams(next.length ? next : ["No Team"]);
      set({ teams: next.length ? next : ["No Team"] });
    } else if (tab === "series") {
      const next = state.series.filter((v) => !lower.has(v.toLowerCase()));
      await setCustomSeries(next);
      set({ series: next });
    } else {
      const next = state.fieldTags.filter((v) => !lower.has(v.toLowerCase()));
      await setCustomFieldTags(next);
      set({ fieldTags: next });
    }
  },

  createPlaybook: async (name, team) => {
    const section: PlaybookSection = {
      id: newId("pb"),
      name: normalizeName(name),
      team,
      playRefs: [],
      updatedAt: new Date().toISOString(),
    };
    const playbooks = [...get().playbooks, section];
    await setPlaybookSections(playbooks);
    set({ playbooks });
    return section;
  },

  updatePlaybook: async (id, patch) => {
    const playbooks = get().playbooks.map((s) =>
      s.id === id
        ? { ...s, ...patch, updatedAt: new Date().toISOString() }
        : s,
    );
    await setPlaybookSections(playbooks);
    set({ playbooks });
  },

  deletePlaybook: async (id) => {
    const playbooks = get().playbooks.filter((s) => s.id !== id);
    await setPlaybookSections(playbooks);
    set({ playbooks });
  },

  addPlayToPlaybook: async (playbookId, playId) => {
    const playbooks = get().playbooks.map((s) => {
      if (s.id !== playbookId) return s;
      if (s.playRefs.includes(playId)) return s;
      return {
        ...s,
        playRefs: [...s.playRefs, playId],
        updatedAt: new Date().toISOString(),
      };
    });
    await setPlaybookSections(playbooks);
    set({ playbooks });
  },

  reorderPlaybookPlays: async (playbookId, fromIndex, toIndex) => {
    const playbooks = get().playbooks.map((s) => {
      if (s.id !== playbookId) return s;
      const refs = [...s.playRefs];
      const [moved] = refs.splice(fromIndex, 1);
      if (!moved) return s;
      refs.splice(toIndex, 0, moved);
      return { ...s, playRefs: refs, updatedAt: new Date().toISOString() };
    });
    await setPlaybookSections(playbooks);
    set({ playbooks });
  },

  removePlayFromPlaybook: async (playbookId, playId) => {
    const playbooks = get().playbooks.map((s) =>
      s.id === playbookId
        ? {
            ...s,
            playRefs: s.playRefs.filter((id) => id !== playId),
            updatedAt: new Date().toISOString(),
          }
        : s,
    );
    await setPlaybookSections(playbooks);
    set({ playbooks });
  },

  resolvePlaybookPlays: (section) => {
    const byId = new Map(get().plays.map((p) => [p.id, p]));
    return section.playRefs.map((id) => byId.get(id)).filter(Boolean) as StoredPlay[];
  },

  createPracticeSession: async () => {
    const now = new Date().toISOString();
    const session: PracticeSession = {
      id: newId("prac"),
      date: now.slice(0, 10),
      title: "Practice",
      team: get().teams[0] || "No Team",
      notes: "",
      items: [],
      createdAt: now,
      updatedAt: now,
    };
    const sessions = [session, ...get().practiceSessions];
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
    return session;
  },

  createPracticeSessionFromTemplate: async (template) => {
    const now = new Date().toISOString();
    const base = sessionFromTemplate(
      template,
      get().plays,
      get().teams[0] || "No Team",
    );
    const session: PracticeSession = {
      ...base,
      id: newId("prac"),
      createdAt: now,
      updatedAt: now,
    };
    const sessions = [session, ...get().practiceSessions];
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
    return session;
  },

  updatePracticeSession: async (id, patch) => {
    const sessions = get().practiceSessions.map((s) =>
      s.id === id
        ? normalizePracticeSession({
            ...s,
            ...patch,
            updatedAt: new Date().toISOString(),
          })
        : s,
    );
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  deletePracticeSession: async (id) => {
    const sessions = get().practiceSessions.filter((s) => s.id !== id);
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  addPracticeItems: async (sessionId, playIds) => {
    const playsById = new Map(get().plays.map((p) => [p.id, p]));
    const sessions = get().practiceSessions.map((s) => {
      if (s.id !== sessionId) return s;
      const existing = new Set(s.items.map((i) => i.playId).filter(Boolean));
      const added: PracticeSessionItem[] = [];
      for (const playId of playIds) {
        if (existing.has(playId)) continue;
        const play = playsById.get(playId);
        added.push({
          id: newPracticeItemId(),
          playId,
          durationMin: defaultPracticeItemDuration(play),
          notes: "",
        });
        existing.add(playId);
      }
      if (!added.length) return s;
      return normalizePracticeSession({
        ...s,
        items: [...s.items, ...added],
        updatedAt: new Date().toISOString(),
      });
    });
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  addPracticeCueBlock: async (sessionId, cueLabel, durationMin = 10) => {
    const label = cueLabel.trim();
    if (!label) return;
    const sessions = get().practiceSessions.map((s) => {
      if (s.id !== sessionId) return s;
      return normalizePracticeSession({
        ...s,
        items: [
          ...s.items,
          {
            id: newPracticeItemId(),
            cueLabel: label,
            durationMin: Math.max(1, durationMin),
            notes: "",
          },
        ],
        updatedAt: new Date().toISOString(),
      });
    });
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  updatePracticeItem: async (sessionId, itemId, patch) => {
    const sessions = get().practiceSessions.map((s) => {
      if (s.id !== sessionId) return s;
      return normalizePracticeSession({
        ...s,
        items: s.items.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item,
        ),
        updatedAt: new Date().toISOString(),
      });
    });
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  removePracticeItem: async (sessionId, itemId) => {
    const sessions = get().practiceSessions.map((s) =>
      s.id === sessionId
        ? normalizePracticeSession({
            ...s,
            items: s.items.filter((i) => i.id !== itemId),
            updatedAt: new Date().toISOString(),
          })
        : s,
    );
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  reorderPracticeItems: async (sessionId, fromIndex, toIndex) => {
    const sessions = get().practiceSessions.map((s) => {
      if (s.id !== sessionId) return s;
      const items = [...s.items];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= items.length ||
        toIndex >= items.length ||
        fromIndex === toIndex
      ) {
        return s;
      }
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return normalizePracticeSession({
        ...s,
        items,
        updatedAt: new Date().toISOString(),
      });
    });
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
  },

  movePracticeItem: async (sessionId, itemId, direction) => {
    const session = get().practiceSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const fromIndex = session.items.findIndex((i) => i.id === itemId);
    if (fromIndex < 0) return;
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    await get().reorderPracticeItems(sessionId, fromIndex, toIndex);
  },
}));
