import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlatformLayout } from "@/lib/settings/platform-layout";
import type { PlatformLayoutSettings } from "@/types/platform-layout";

const ROW_ID = "default";

export async function fetchCloudPlatformLayout(
  supabase: SupabaseClient,
): Promise<
  | { ok: true; layout: PlatformLayoutSettings | null }
  | { ok: false; error: string }
> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select("layout, updated_at")
    .eq("id", ROW_ID)
    .maybeSingle();

  if (error) {
    // Table may not exist yet on older projects.
    if (/relation .*platform_settings.* does not exist/i.test(error.message)) {
      return { ok: true, layout: null };
    }
    return { ok: false, error: error.message };
  }
  if (!data?.layout) return { ok: true, layout: null };
  return {
    ok: true,
    layout: normalizePlatformLayout({
      ...(data.layout as object),
      updatedAt: data.updated_at ?? undefined,
    }),
  };
}

export async function saveCloudPlatformLayout(
  supabase: SupabaseClient,
  layout: PlatformLayoutSettings,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizePlatformLayout(layout);
  const { error } = await supabase.from("platform_settings").upsert(
    {
      id: ROW_ID,
      layout: {
        libraryColumns: normalized.libraryColumns,
        libraryFramesGrid: normalized.libraryFramesGrid,
        designerColumns: normalized.designerColumns,
      },
      updated_at: normalized.updatedAt,
    },
    { onConflict: "id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
