import {
  normalizeFieldTagColors,
  type FieldTagColors,
} from "@/lib/library/tag-colors";
import { getLibraryDb } from "@/lib/library/idb";
import {
  loadDefaultFieldsConfig,
  mergeFieldLists,
  stripProtectedDefaultFields,
} from "@/lib/settings/default-fields";
import type { PlaybookSection, PracticePlannerData, GamePlan, PlayerHomeworkAssignment } from "@/types/library-meta";

const KEYS = {
  seasons: "customSeasons_v6",
  teams: "customTeams_v6",
  series: "customCategories_v6",
  tags: "customFieldTags_v6",
  tagColors: "customFieldTagColors_v1",
  playbooks: "playData_sections_v1",
  practice: "practicePlannerData_v1",
  gamePlans: "gamePlans_v1",
  playerHomework: "playerHomework_v1",
} as const;

export async function getMetaJson<T>(key: string, fallback: T): Promise<T> {
  const db = await getLibraryDb();
  const row = await db.get("meta", key);
  if (!row?.value) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function setMetaJson<T>(key: string, value: T): Promise<void> {
  const db = await getLibraryDb();
  await db.put("meta", { key, value: JSON.stringify(value) });
}

export async function getUserCustomSeasons() {
  return getMetaJson<string[]>(KEYS.seasons, []);
}

export async function getCustomSeasons() {
  const defaults = loadDefaultFieldsConfig();
  const userRows = await getUserCustomSeasons();
  return mergeFieldLists(userRows, defaults.seasons);
}

export async function setCustomSeasons(values: string[]) {
  await setMetaJson(KEYS.seasons, stripProtectedDefaultFields("seasons", values));
}

export async function getCustomTeams() {
  const rows = await getMetaJson<string[]>(KEYS.teams, ["No Team"]);
  return rows.length ? rows : ["No Team"];
}

export async function setCustomTeams(values: string[]) {
  await setMetaJson(KEYS.teams, values);
}

export async function getUserCustomSeries() {
  return getMetaJson<string[]>(KEYS.series, []);
}

export async function getCustomSeries() {
  const defaults = loadDefaultFieldsConfig();
  const userRows = await getUserCustomSeries();
  return mergeFieldLists(userRows, defaults.series);
}

export async function setCustomSeries(values: string[]) {
  await setMetaJson(KEYS.series, stripProtectedDefaultFields("series", values));
}

export async function getUserCustomFieldTags() {
  return getMetaJson<string[]>(KEYS.tags, []);
}

export async function getCustomFieldTags() {
  const defaults = loadDefaultFieldsConfig();
  const userRows = await getUserCustomFieldTags();
  return mergeFieldLists(userRows, defaults.tags);
}

export async function setCustomFieldTags(values: string[]) {
  await setMetaJson(KEYS.tags, stripProtectedDefaultFields("tags", values));
}

export async function getCustomFieldTagColors() {
  const raw = await getMetaJson<unknown>(KEYS.tagColors, {});
  return normalizeFieldTagColors(raw);
}

export async function setCustomFieldTagColors(values: FieldTagColors) {
  await setMetaJson(KEYS.tagColors, normalizeFieldTagColors(values));
}

export async function getPlaybookSections() {
  return getMetaJson<PlaybookSection[]>(KEYS.playbooks, []);
}

export async function setPlaybookSections(sections: PlaybookSection[]) {
  await setMetaJson(KEYS.playbooks, sections);
}

export async function getPracticeData() {
  return getMetaJson<PracticePlannerData>(KEYS.practice, { sessions: [] });
}

export async function setPracticeData(data: PracticePlannerData) {
  await setMetaJson(KEYS.practice, data);
}

export async function getGamePlans() {
  return getMetaJson<GamePlan[]>(KEYS.gamePlans, []);
}

export async function setGamePlans(plans: GamePlan[]) {
  await setMetaJson(KEYS.gamePlans, plans);
}

export async function getPlayerHomework() {
  return getMetaJson<PlayerHomeworkAssignment[]>(KEYS.playerHomework, []);
}

export async function setPlayerHomework(assignments: PlayerHomeworkAssignment[]) {
  await setMetaJson(KEYS.playerHomework, assignments);
}
