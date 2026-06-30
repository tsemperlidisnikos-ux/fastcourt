"use client";

import { useEffect, useSyncExternalStore } from "react";
import { normalizeCourtWoodTextureId } from "@/lib/designer/court-assets";
import {
  getLoadedCourtWoodTexture,
  isCourtWoodTextureFailed,
  loadCourtWoodTexture,
  subscribeCourtWoodTextureCache,
} from "@/lib/designer/court-wood-texture-cache";

export function useCourtWoodTexture(
  enabled: boolean,
  textureId?: string | null,
) {
  const normalizedId = normalizeCourtWoodTextureId(textureId);

  const image = useSyncExternalStore(
    subscribeCourtWoodTextureCache,
    () =>
      enabled ? getLoadedCourtWoodTexture(normalizedId) : null,
    () => null,
  );

  const failed = useSyncExternalStore(
    subscribeCourtWoodTextureCache,
    () => (enabled ? isCourtWoodTextureFailed(normalizedId) : false),
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;
    if (getLoadedCourtWoodTexture(normalizedId)) return;
    void loadCourtWoodTexture(normalizedId).catch(() => {
      /* state updates via cache notify */
    });
  }, [enabled, normalizedId]);

  const loading = enabled && !image && !failed;

  return { image, failed, loading };
}
