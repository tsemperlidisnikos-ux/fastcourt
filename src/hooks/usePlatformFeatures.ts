"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PLATFORM_FEATURES,
  PLATFORM_FEATURES_CHANGED_EVENT,
  PLATFORM_FEATURES_STORAGE_KEY,
  loadPlatformFeatures,
} from "@/lib/settings/platform-features";
import type { PlatformFeaturesConfig } from "@/types/platform-features";

export function usePlatformFeatures(): PlatformFeaturesConfig {
  const [features, setFeatures] = useState(DEFAULT_PLATFORM_FEATURES);

  const refresh = useCallback(() => {
    setFeatures(loadPlatformFeatures());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === PLATFORM_FEATURES_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(PLATFORM_FEATURES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(PLATFORM_FEATURES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return features;
}
