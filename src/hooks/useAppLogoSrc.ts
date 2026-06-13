"use client";

import { useEffect } from "react";
import { resolveAppLogoSrc } from "@/lib/settings/app-logo";
import { useSettingsStore } from "@/stores/settings-store";

export function useAppLogoSrc(): string {
  const customLogo = useSettingsStore((s) => s.appLogoDataUrl);
  const hydrated = useSettingsStore((s) => s.hydrated);
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  return resolveAppLogoSrc(customLogo);
}
