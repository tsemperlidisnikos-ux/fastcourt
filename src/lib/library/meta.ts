import { getLibraryDb } from "@/lib/library/idb";
import type { PlaybookSection, PracticePlannerData } from "@/types/library-meta";

const KEYS = {
  seasons: "customSeasons_v6",
  teams: "customTeams_v6",
  series: "customCategories_v6",
  tags: "customFieldTags_v6",
  playbooks: "playData_sections_v1",
  practice: "practicePlannerData_v1",
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

export async function getCustomSeasons() {
  const rows = await getMetaJson<string[]>(KEYS.seasons, ["Default"]);
  return rows.length ? rows : ["Default"];
}

export async function setCustomSeasons(values: string[]) {
  await setMetaJson(KEYS.seasons, values);
}

export async function getCustomTeams() {
  const rows = await getMetaJson<string[]>(KEYS.teams, ["No Team"]);
  return rows.length ? rows : ["No Team"];
}

export async function setCustomTeams(values: string[]) {
  await setMetaJson(KEYS.teams, values);
}

export async function getCustomSeries() {
  return getMetaJson<string[]>(KEYS.series, []);
}

export async function setCustomSeries(values: string[]) {
  await setMetaJson(KEYS.series, values);
}

export async function getCustomFieldTags() {
  return getMetaJson<string[]>(KEYS.tags, []);
}

export async function setCustomFieldTags(values: string[]) {
  await setMetaJson(KEYS.tags, values);
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
