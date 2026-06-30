import {
  setCustomFieldTags,
  setCustomSeasons,
  setCustomSeries,
} from "@/lib/library/meta";
import {
  createEmptyDefaultFieldsConfig,
  saveDefaultFieldsConfig,
} from "@/lib/settings/default-fields";
import type { DefaultFieldsConfig } from "@/types/default-fields";

export async function clearFieldCategory(
  category: keyof DefaultFieldsConfig,
  config: DefaultFieldsConfig,
): Promise<DefaultFieldsConfig> {
  const next: DefaultFieldsConfig = { ...config, [category]: [] };
  if (category === "seasons") await setCustomSeasons([]);
  else if (category === "series") await setCustomSeries([]);
  else await setCustomFieldTags([]);

  if (typeof window !== "undefined") {
    const allEmpty =
      next.seasons.length === 0 &&
      next.series.length === 0 &&
      next.tags.length === 0;
    if (allEmpty) {
      localStorage.removeItem("fastcourt_default_fields_v1");
    } else {
      saveDefaultFieldsConfig(next);
    }
  }

  return next;
}

export async function clearAllFieldCategoryEntries(): Promise<DefaultFieldsConfig> {
  const next = createEmptyDefaultFieldsConfig();
  if (typeof window !== "undefined") {
    localStorage.removeItem("fastcourt_default_fields_v1");
  }
  await Promise.all([
    setCustomSeasons([]),
    setCustomSeries([]),
    setCustomFieldTags([]),
  ]);
  return next;
}
