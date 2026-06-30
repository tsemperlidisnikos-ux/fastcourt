import {
  getCustomFieldTags,
  getCustomSeasons,
  getCustomSeries,
  getCustomTeams,
  getPlaybookSections,
  getPracticeData,
  getGamePlans,
  getPlayerHomework,
  setCustomFieldTags,
  setCustomSeasons,
  setCustomSeries,
  setCustomTeams,
  setPlaybookSections,
  setPracticeData,
  setGamePlans,
  setPlayerHomework,
} from "@/lib/library/meta";
import type { CloudOrganizerMeta } from "@/lib/cloud/library-meta-types";

export async function gatherLocalOrganizerMeta(): Promise<CloudOrganizerMeta> {
  const [seasons, teams, series, fieldTags, playbooks, practice, gamePlans, playerHomework] =
    await Promise.all([
      getCustomSeasons(),
      getCustomTeams(),
      getCustomSeries(),
      getCustomFieldTags(),
      getPlaybookSections(),
      getPracticeData(),
      getGamePlans(),
      getPlayerHomework(),
    ]);
  return { seasons, teams, series, fieldTags, playbooks, practice, gamePlans, playerHomework };
}

export async function applyLocalOrganizerMeta(meta: CloudOrganizerMeta): Promise<void> {
  await Promise.all([
    setCustomSeasons(meta.seasons),
    setCustomTeams(meta.teams),
    setCustomSeries(meta.series),
    setCustomFieldTags(meta.fieldTags),
    setPlaybookSections(meta.playbooks),
    setPracticeData(meta.practice),
    setGamePlans(meta.gamePlans),
    setPlayerHomework(meta.playerHomework),
  ]);
}
