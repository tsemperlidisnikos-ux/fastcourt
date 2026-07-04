"use client";

import { create } from "zustand";
import {
  getCustomFieldTags,
  getCustomFieldTagColors,
  getCustomSeasons,
  getCustomSeries,
  getCustomTeams,
  getPlaybookSections,
  getPracticeData,
  getGamePlans,
  getUserCustomFieldTags,
  getUserCustomSeasons,
  getUserCustomSeries,
  setCustomFieldTags,
  setCustomFieldTagColors,
  setCustomSeasons,
  setCustomSeries,
  setCustomTeams,
  setPlaybookSections,
  setPracticeData,
  setGamePlans,
  getPlayerHomework,
  setPlayerHomework,
} from "@/lib/library/meta";
import { createRematchGamePlan } from "@/lib/game-plan/opponent-history";
import { getTeamRoster } from "@/lib/players/player-roster";
import {
  buildHomeworkFromGamePlan,
  normalizePlayerHomework,
} from "@/lib/game-plan/player-homework";
import {
  ensureHomeworkPlayerToken,
  validateHomeworkPlayerToken,
} from "@/lib/game-plan/player-homework-ack";
import type { HomeworkAckType } from "@/lib/game-plan/player-homework-ack";
import { buildPracticeSessionFromGamePlan } from "@/lib/game-plan/prep-practice";
import type { DisruptionPracticeEntry } from "@/lib/film-room/film-practice-disruption";
import {
  buildDisruptionHomeworkFromPlan,
  mergeHomeworkReadItems,
} from "@/lib/film-room/film-homework-disruption";
import {
  createGamePlanDraft,
  duplicateGamePlan,
  newGamePlanEntryId,
  normalizeGamePlan,
} from "@/lib/game-plan/game-plan-items";
import {
  removeTagColorKeys,
  renameTagColorKey,
  resolveTagColor,
  tagColorKey,
  type FieldTagColors,
} from "@/lib/library/tag-colors";
import { isProtectedDefaultField } from "@/lib/settings/default-fields";
import { listStoredPlays, putStoredPlays } from "@/lib/library/idb";
import { recordLibraryDeletion } from "@/lib/library/tombstones";
import {
  defaultPracticeItemDuration,
  newPracticeItemId,
  normalizePracticeSession,
} from "@/lib/practice/practice-items";
import { sessionFromTemplate } from "@/lib/practice/templates";
import type { StoredPlay } from "@/types/library";
import type {
  FieldsSubTab,
  GamePlan,
  GamePlanCategoryId,
  GamePlanEntry,
  GamePlanStatus,
  PlayerHomeworkAssignment,
  PlayerHomeworkReadItem,
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
  fieldTagColors: FieldTagColors;
  playbooks: PlaybookSection[];
  gamePlans: GamePlan[];
  playerHomework: PlayerHomeworkAssignment[];
  practiceSessions: PracticeSession[];
  plays: StoredPlay[];
  hydrated: boolean;
  loadMeta: () => Promise<void>;
  addField: (
    tab: FieldsSubTab,
    name: string,
    options?: { tagColor?: string },
  ) => Promise<boolean>;
  setTagColor: (name: string, color: string) => Promise<void>;
  tagColorFor: (name: string) => string;
  renameField: (tab: FieldsSubTab, oldName: string, newName: string) => Promise<boolean>;
  deleteFields: (tab: FieldsSubTab, names: string[]) => Promise<boolean>;
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
  createGamePlan: (opponent: string, team: string) => Promise<GamePlan>;
  updateGamePlan: (id: string, patch: Partial<GamePlan>) => Promise<void>;
  deleteGamePlan: (id: string) => Promise<void>;
  duplicateGamePlanById: (id: string) => Promise<GamePlan | null>;
  createRematchGamePlanById: (id: string, gameDate: string) => Promise<GamePlan | null>;
  setGamePlanStatus: (id: string, status: GamePlanStatus) => Promise<void>;
  addPlaysToGamePlanCategory: (
    planId: string,
    categoryId: GamePlanCategoryId,
    playIds: string[],
  ) => Promise<void>;
  updateGamePlanEntry: (
    planId: string,
    entryId: string,
    patch: Partial<GamePlanEntry>,
  ) => Promise<void>;
  removeGamePlanEntry: (planId: string, entryId: string) => Promise<void>;
  reorderGamePlanEntry: (
    planId: string,
    entryId: string,
    direction: "up" | "down",
  ) => Promise<void>;
  createPracticeSessionFromGamePlan: (planId: string) => Promise<PracticeSession | null>;
  createPlayerHomeworkFromGamePlan: (
    planId: string,
    dueDate?: string,
  ) => Promise<PlayerHomeworkAssignment | null>;
  updatePlayerHomework: (
    id: string,
    patch: Partial<PlayerHomeworkAssignment>,
  ) => Promise<void>;
  deletePlayerHomework: (id: string) => Promise<void>;
  setPlayerHomeworkStudied: (
    homeworkId: string,
    playerId: string,
    studied: boolean,
  ) => Promise<void>;
  applyPlayerHomeworkAck: (
    homeworkId: string,
    playerId: string,
    token: string,
    type: HomeworkAckType,
  ) => Promise<boolean>;
  ensureHomeworkPlayerTokens: (homeworkId: string) => Promise<PlayerHomeworkAssignment | null>;
  createPracticeSession: () => Promise<PracticeSession>;
  createPracticeSessionFromTemplate: (
    template: PracticeTemplate,
  ) => Promise<PracticeSession>;
  duplicatePracticeSession: (id: string) => Promise<PracticeSession | null>;
  updatePracticeSession: (
    id: string,
    patch: Partial<PracticeSession>,
  ) => Promise<void>;
  deletePracticeSession: (id: string) => Promise<void>;
  addPracticeItems: (sessionId: string, playIds: string[]) => Promise<void>;
  addDisruptionReadsToPractice: (
    sessionId: string,
    entries: DisruptionPracticeEntry[],
  ) => Promise<number>;
  addDisruptionReadsToHomework: (
    homeworkId: string,
    readItems: PlayerHomeworkReadItem[],
  ) => Promise<number>;
  createDisruptionHomeworkFromGamePlan: (
    planId: string,
    readItems: PlayerHomeworkReadItem[],
    sessionTitle?: string,
  ) => Promise<PlayerHomeworkAssignment | null>;
  addPlaybookToSession: (sessionId: string, playbookId: string) => Promise<void>;
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
  seasons: [],
  teams: ["No Team"],
  series: [],
  fieldTags: [],
  fieldTagColors: {},
  playbooks: [],
  gamePlans: [],
  playerHomework: [],
  practiceSessions: [],
  plays: [],
  hydrated: false,

  loadMeta: async () => {
    const { ensureLibraryScopeReady } = await import("@/lib/library/library-scope");
    const ready = await ensureLibraryScopeReady();
    if (!ready) return;

    const [seasons, teams, series, fieldTags, fieldTagColors, playbooks, practice, gamePlans, playerHomework, plays] =
      await Promise.all([
        getCustomSeasons(),
        getCustomTeams(),
        getCustomSeries(),
        getCustomFieldTags(),
        getCustomFieldTagColors(),
        getPlaybookSections(),
        getPracticeData(),
        getGamePlans(),
        getPlayerHomework(),
        listStoredPlays(),
      ]);
    set({
      seasons,
      teams,
      series,
      fieldTags,
      fieldTagColors,
      playbooks,
      gamePlans: gamePlans.map(normalizeGamePlan),
      playerHomework: playerHomework.map(normalizePlayerHomework),
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

  addField: async (tab, rawName, options) => {
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
    const exists = list.some((v) => v.toLowerCase() === name.toLowerCase());
    if (exists && tab !== "tags") return false;

    if (!exists) {
      const next = [...list, name].sort((a, b) => a.localeCompare(b));
      if (tab === "seasons") await setCustomSeasons(next);
      else if (tab === "teams") await setCustomTeams(next);
      else if (tab === "series") await setCustomSeries(next);
      else await setCustomFieldTags(next);
      set({ [listKey]: next } as Partial<OrganizerState>);
    }

    if (tab === "tags" && options?.tagColor) {
      const nextColors = {
        ...get().fieldTagColors,
        [tagColorKey(name)]: options.tagColor,
      };
      await setCustomFieldTagColors(nextColors);
      set({ fieldTagColors: nextColors });
    }

    return true;
  },

  setTagColor: async (name, color) => {
    const normalized = normalizeName(name);
    const key = tagColorKey(normalized);
    if (!key || !color.trim()) return;
    const nextColors = {
      ...get().fieldTagColors,
      [key]: color.trim(),
    };
    await setCustomFieldTagColors(nextColors);
    set({ fieldTagColors: nextColors });
  },

  tagColorFor: (name) => resolveTagColor(name, get().fieldTagColors),

  renameField: async (tab, oldName, rawNewName) => {
    const oldTrimmed = oldName.trim();
    const newName = normalizeName(rawNewName);
    if (!newName) return false;
    if (oldTrimmed.toLowerCase() === newName.toLowerCase()) return true;

    if (
      (tab === "seasons" || tab === "series" || tab === "tags") &&
      isProtectedDefaultField(tab, oldTrimmed)
    ) {
      return false;
    }

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
    const oldLower = oldTrimmed.toLowerCase();

    if (
      list.some(
        (value) =>
          value.toLowerCase() === newName.toLowerCase() &&
          value.toLowerCase() !== oldLower,
      )
    ) {
      return false;
    }
    if (!list.some((value) => value.toLowerCase() === oldLower)) {
      return false;
    }

    const nextList = list
      .map((value) => (value.toLowerCase() === oldLower ? newName : value))
      .sort((a, b) => a.localeCompare(b));

    if (tab === "seasons") await setCustomSeasons(nextList);
    else if (tab === "teams") await setCustomTeams(nextList);
    else if (tab === "series") await setCustomSeries(nextList);
    else {
      await setCustomFieldTags(nextList);
      const nextColors = renameTagColorKey(state.fieldTagColors, oldTrimmed, newName);
      await setCustomFieldTagColors(nextColors);
      set({ fieldTags: nextList, fieldTagColors: nextColors });
    }

    const now = new Date().toISOString();
    const allPlays = await listStoredPlays();
    let playsChanged = false;
    const nextPlays = allPlays.map((play) => {
      if (tab === "seasons") {
        if ((play.season || "").toLowerCase() === oldLower) {
          playsChanged = true;
          return { ...play, season: newName, updatedAt: now };
        }
      } else if (tab === "teams") {
        if ((play.team || "").toLowerCase() === oldLower) {
          playsChanged = true;
          return { ...play, team: newName, updatedAt: now };
        }
      } else if (tab === "series") {
        if ((play.series || "").toLowerCase() === oldLower) {
          playsChanged = true;
          return { ...play, series: newName, updatedAt: now };
        }
      } else if ((play.tags || []).some((tag) => tag.toLowerCase() === oldLower)) {
        playsChanged = true;
        return {
          ...play,
          tags: (play.tags || []).map((tag) =>
            tag.toLowerCase() === oldLower ? newName : tag,
          ),
          updatedAt: now,
        };
      }
      return play;
    });
    if (playsChanged) await putStoredPlays(nextPlays);

    let playbooks = state.playbooks;
    let practiceSessions = state.practiceSessions;
    let gamePlans = state.gamePlans;
    if (tab === "teams") {
      playbooks = playbooks.map((section) =>
        (section.team || "").toLowerCase() === oldLower
          ? { ...section, team: newName, updatedAt: now }
          : section,
      );
      await setPlaybookSections(playbooks);
      practiceSessions = practiceSessions.map((session) =>
        (session.team || "").toLowerCase() === oldLower
          ? { ...session, team: newName, updatedAt: now }
          : session,
      );
      await setPracticeData({ sessions: practiceSessions });
      gamePlans = gamePlans.map((plan) =>
        (plan.team || "").toLowerCase() === oldLower
          ? normalizeGamePlan({ ...plan, team: newName, updatedAt: now })
          : plan,
      );
      await setGamePlans(gamePlans);
      const { renameTeamRoster } = await import("@/lib/players/player-roster");
      renameTeamRoster(oldTrimmed, newName);
    }

    set({
      [listKey]: nextList,
      plays: nextPlays,
      playbooks,
      practiceSessions,
      gamePlans,
    } as Partial<OrganizerState>);

    const { useLibraryStore } = await import("@/stores/library-store");
    await useLibraryStore.getState().refresh();
    return true;
  },

  deleteFields: async (tab, names) => {
    const lower = new Set(names.map((n) => n.toLowerCase()));
    const state = get();
    if (tab === "seasons") {
      if (names.some((name) => isProtectedDefaultField("seasons", name))) {
        return false;
      }
      const userRows = await getUserCustomSeasons();
      const next = userRows.filter((value) => !lower.has(value.toLowerCase()));
      await setCustomSeasons(next);
      set({ seasons: await getCustomSeasons() });
      return true;
    }
    if (tab === "teams") {
      const next = state.teams.filter((v) => !lower.has(v.toLowerCase()));
      await setCustomTeams(next.length ? next : ["No Team"]);
      set({ teams: next.length ? next : ["No Team"] });
      return true;
    }
    if (tab === "series") {
      if (names.some((name) => isProtectedDefaultField("series", name))) {
        return false;
      }
      const userRows = await getUserCustomSeries();
      const next = userRows.filter((value) => !lower.has(value.toLowerCase()));
      await setCustomSeries(next);
      set({ series: await getCustomSeries() });
      return true;
    }
    if (names.some((name) => isProtectedDefaultField("tags", name))) {
      return false;
    }
    const userRows = await getUserCustomFieldTags();
    const next = userRows.filter((value) => !lower.has(value.toLowerCase()));
    await setCustomFieldTags(next);
    const nextColors = removeTagColorKeys(state.fieldTagColors, names);
    await setCustomFieldTagColors(nextColors);
    set({
      fieldTags: await getCustomFieldTags(),
      fieldTagColors: nextColors,
    });
    return true;
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
    await recordLibraryDeletion(id, "playbook");
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

  createGamePlan: async (opponent, team) => {
    const plan = createGamePlanDraft(opponent, team);
    const gamePlans = [plan, ...get().gamePlans];
    await setGamePlans(gamePlans);
    set({ gamePlans });
    return plan;
  },

  updateGamePlan: async (id, patch) => {
    const gamePlans = get().gamePlans.map((plan) =>
      plan.id === id
        ? normalizeGamePlan({
            ...plan,
            ...patch,
            updatedAt: new Date().toISOString(),
          })
        : plan,
    );
    await setGamePlans(gamePlans);
    set({ gamePlans });
  },

  deleteGamePlan: async (id) => {
    const gamePlans = get().gamePlans.filter((plan) => plan.id !== id);
    await setGamePlans(gamePlans);
    await recordLibraryDeletion(id, "gameplan");
    const playerHomework = get().playerHomework.filter(
      (row) => row.gamePlanId !== id,
    );
    if (playerHomework.length !== get().playerHomework.length) {
      await setPlayerHomework(playerHomework);
    }
    set({ gamePlans, playerHomework });
  },

  duplicateGamePlanById: async (id) => {
    const source = get().gamePlans.find((plan) => plan.id === id);
    if (!source) return null;
    const plan = duplicateGamePlan(source);
    const gamePlans = [plan, ...get().gamePlans];
    await setGamePlans(gamePlans);
    set({ gamePlans });
    return plan;
  },

  createRematchGamePlanById: async (id, gameDate) => {
    const source = get().gamePlans.find((plan) => plan.id === id);
    if (!source) return null;
    const plan = createRematchGamePlan(source, gameDate);
    const gamePlans = [plan, ...get().gamePlans];
    await setGamePlans(gamePlans);
    set({ gamePlans });
    return plan;
  },

  setGamePlanStatus: async (id, status) => {
    await get().updateGamePlan(id, { status });
  },

  addPlaysToGamePlanCategory: async (planId, categoryId, playIds) => {
    if (!playIds.length) return;
    const gamePlans = get().gamePlans.map((plan) => {
      if (plan.id !== planId) return plan;
      const existingPlayIds = new Set(
        plan.entries.map((entry) => entry.playId).filter(Boolean),
      );
      const added: GamePlanEntry[] = [];
      for (const playId of playIds) {
        if (existingPlayIds.has(playId)) continue;
        added.push({
          id: newGamePlanEntryId(),
          categoryId,
          playId,
        });
        existingPlayIds.add(playId);
      }
      if (!added.length) return plan;
      return normalizeGamePlan({
        ...plan,
        entries: [...plan.entries, ...added],
        updatedAt: new Date().toISOString(),
      });
    });
    await setGamePlans(gamePlans);
    set({ gamePlans });
  },

  updateGamePlanEntry: async (planId, entryId, patch) => {
    const gamePlans = get().gamePlans.map((plan) => {
      if (plan.id !== planId) return plan;
      return normalizeGamePlan({
        ...plan,
        entries: plan.entries.map((entry) =>
          entry.id === entryId ? { ...entry, ...patch } : entry,
        ),
        updatedAt: new Date().toISOString(),
      });
    });
    await setGamePlans(gamePlans);
    set({ gamePlans });
  },

  removeGamePlanEntry: async (planId, entryId) => {
    const gamePlans = get().gamePlans.map((plan) => {
      if (plan.id !== planId) return plan;
      return normalizeGamePlan({
        ...plan,
        entries: plan.entries.filter((entry) => entry.id !== entryId),
        updatedAt: new Date().toISOString(),
      });
    });
    await setGamePlans(gamePlans);
    set({ gamePlans });
  },

  reorderGamePlanEntry: async (planId, entryId, direction) => {
    const plan = get().gamePlans.find((row) => row.id === planId);
    if (!plan) return;
    const entry = plan.entries.find((row) => row.id === entryId);
    if (!entry) return;
    const categoryEntries = plan.entries.filter(
      (row) => row.categoryId === entry.categoryId,
    );
    const fromIndex = categoryEntries.findIndex((row) => row.id === entryId);
    if (fromIndex < 0) return;
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= categoryEntries.length) return;

    const reorderedCategory = [...categoryEntries];
    const [moved] = reorderedCategory.splice(fromIndex, 1);
    reorderedCategory.splice(toIndex, 0, moved);

    const categoryIds = new Set(reorderedCategory.map((row) => row.id));
    const nextEntries: GamePlanEntry[] = [];
    let categoryInserted = false;
    for (const row of plan.entries) {
      if (categoryIds.has(row.id)) {
        if (!categoryInserted) {
          nextEntries.push(...reorderedCategory);
          categoryInserted = true;
        }
        continue;
      }
      nextEntries.push(row);
    }
    if (!categoryInserted) nextEntries.push(...reorderedCategory);

    await get().updateGamePlan(planId, { entries: nextEntries });
  },

  createPracticeSessionFromGamePlan: async (planId) => {
    const plan = get().gamePlans.find((row) => row.id === planId);
    if (!plan) return null;
    const session = buildPracticeSessionFromGamePlan(plan, get().plays, {
      sessionId: newId("prac"),
    });
    if (!session.items.length) return null;
    const sessions = [session, ...get().practiceSessions];
    await setPracticeData({ sessions });
    set({ practiceSessions: sessions });
    return session;
  },

  createPlayerHomeworkFromGamePlan: async (planId, dueDate) => {
    const plan = get().gamePlans.find((row) => row.id === planId);
    if (!plan) return null;
    const assignment = buildHomeworkFromGamePlan(plan, { dueDate });
    if (!assignment.playIds.length) return null;
    const playerHomework = [assignment, ...get().playerHomework];
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
    return assignment;
  },

  updatePlayerHomework: async (id, patch) => {
    const playerHomework = get().playerHomework.map((row) =>
      row.id === id
        ? normalizePlayerHomework({
            ...row,
            ...patch,
            updatedAt: new Date().toISOString(),
          })
        : row,
    );
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
  },

  deletePlayerHomework: async (id) => {
    const playerHomework = get().playerHomework.filter((row) => row.id !== id);
    await setPlayerHomework(playerHomework);
    await recordLibraryDeletion(id, "homework");
    set({ playerHomework });
  },

  setPlayerHomeworkStudied: async (homeworkId, playerId, studied) => {
    const playerHomework = get().playerHomework.map((row) => {
      if (row.id !== homeworkId) return row;
      const nextStatus = { ...row.playerStatus };
      if (studied) {
        nextStatus[playerId] = {
          studied: true,
          studiedAt: new Date().toISOString(),
          openedAt: nextStatus[playerId]?.openedAt,
          source: "coach",
        };
      } else {
        delete nextStatus[playerId];
      }
      return normalizePlayerHomework({
        ...row,
        playerStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    });
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
  },

  applyPlayerHomeworkAck: async (homeworkId, playerId, token, type) => {
    const current = get().playerHomework.find((row) => row.id === homeworkId);
    if (!current || !validateHomeworkPlayerToken(current, playerId, token)) {
      return false;
    }
    const now = new Date().toISOString();
    const playerHomework = get().playerHomework.map((row) => {
      if (row.id !== homeworkId) return row;
      const prev = row.playerStatus[playerId] || { studied: false };
      const nextStatus = { ...row.playerStatus };
      if (type === "open") {
        nextStatus[playerId] = {
          ...prev,
          openedAt: prev.openedAt || now,
          source: "player",
        };
      } else {
        nextStatus[playerId] = {
          ...prev,
          studied: true,
          studiedAt: now,
          openedAt: prev.openedAt || now,
          source: "player",
        };
      }
      return normalizePlayerHomework({
        ...row,
        playerStatus: nextStatus,
        updatedAt: now,
      });
    });
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
    return true;
  },

  ensureHomeworkPlayerTokens: async (homeworkId) => {
    const current = get().playerHomework.find((row) => row.id === homeworkId);
    if (!current) return null;
    const roster = getTeamRoster(current.team).players;
    let tokens = { ...(current.playerTokens || {}) };
    let changed = false;
    for (const player of roster) {
      const next = ensureHomeworkPlayerToken({ ...current, playerTokens: tokens }, player.id);
      if (next[player.id] !== tokens[player.id]) changed = true;
      tokens = next;
    }
    if (!changed) return current;
    const playerHomework = get().playerHomework.map((row) =>
      row.id === homeworkId
        ? normalizePlayerHomework({
            ...row,
            playerTokens: tokens,
            updatedAt: new Date().toISOString(),
          })
        : row,
    );
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
    return playerHomework.find((row) => row.id === homeworkId) || null;
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

  duplicatePracticeSession: async (id) => {
    const source = get().practiceSessions.find((s) => s.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const session = normalizePracticeSession({
      ...source,
      id: newId("prac"),
      title: `${source.title || "Practice"} (copy)`,
      items: source.items.map((item) => ({
        ...item,
        id: newPracticeItemId(),
      })),
      createdAt: now,
      updatedAt: now,
    });
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
    await recordLibraryDeletion(id, "practice");
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

  addDisruptionReadsToPractice: async (sessionId, entries) => {
    if (!entries.length) return 0;
    const playsById = new Map(get().plays.map((p) => [p.id, p]));
    let addedCount = 0;
    const sessions = get().practiceSessions.map((s) => {
      if (s.id !== sessionId) return s;
      const existing = new Set(s.items.map((i) => i.playId).filter(Boolean));
      const added: PracticeSessionItem[] = [];
      for (const entry of entries) {
        if (existing.has(entry.playId)) continue;
        const play = playsById.get(entry.playId);
        if (!play) continue;
        added.push({
          id: newPracticeItemId(),
          playId: entry.playId,
          durationMin: entry.durationMin ?? defaultPracticeItemDuration(play),
          notes: entry.notes?.trim() || "",
          liveCall: entry.liveCall?.trim() || undefined,
          designerFrameIndex:
            typeof entry.designerFrameIndex === "number" &&
            Number.isFinite(entry.designerFrameIndex) &&
            entry.designerFrameIndex >= 0
              ? Math.floor(entry.designerFrameIndex)
              : undefined,
        });
        existing.add(entry.playId);
        addedCount += 1;
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
    return addedCount;
  },

  addDisruptionReadsToHomework: async (homeworkId, readItems) => {
    if (!readItems.length) return 0;
    const playsById = new Map(get().plays.map((p) => [p.id, p]));
    let addedCount = 0;
    const playerHomework = get().playerHomework.map((row) => {
      if (row.id !== homeworkId) return row;
      const mergedReads = mergeHomeworkReadItems(row.readItems, readItems);
      addedCount = mergedReads.length - (row.readItems?.length ?? 0);
      if (addedCount <= 0) return row;
      const playIdSet = new Set(row.playIds);
      for (const item of readItems) {
        if (playsById.has(item.playId)) playIdSet.add(item.playId);
      }
      return normalizePlayerHomework({
        ...row,
        playIds: [...playIdSet],
        readItems: mergedReads,
        updatedAt: new Date().toISOString(),
      });
    });
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
    return addedCount;
  },

  createDisruptionHomeworkFromGamePlan: async (planId, readItems, sessionTitle) => {
    if (!readItems.length) return null;
    const plan = get().gamePlans.find((row) => row.id === planId);
    if (!plan) return null;
    const playsById = new Map(get().plays.map((p) => [p.id, p]));
    const validReads = readItems.filter((row) => playsById.has(row.playId));
    if (!validReads.length) return null;
    const assignment = buildDisruptionHomeworkFromPlan(plan, validReads, sessionTitle);
    const playerHomework = [assignment, ...get().playerHomework];
    await setPlayerHomework(playerHomework);
    set({ playerHomework });
    return assignment;
  },

  addPlaybookToSession: async (sessionId, playbookId) => {
    const playbook = get().playbooks.find((pb) => pb.id === playbookId);
    if (!playbook?.playRefs.length) return;
    await get().addPracticeItems(sessionId, playbook.playRefs);
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
