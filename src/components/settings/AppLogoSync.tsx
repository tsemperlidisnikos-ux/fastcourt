"use client";

import { useEffect, useLayoutEffect } from "react";
import { loadAppLogoDataUrl, APP_LOGO_CHANGED_EVENT } from "@/lib/settings/app-logo";
import { useSettingsStore } from "@/stores/settings-store";

export function syncAppLogoFromStorage() {
  const next = loadAppLogoDataUrl();
  const current = useSettingsStore.getState().appLogoDataUrl;
  if (current === next) return;
  useSettingsStore.setState({ appLogoDataUrl: next });
}

export function AppLogoSync() {
  useLayoutEffect(() => {
    syncAppLogoFromStorage();
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "fastcourt_app_logo_v1") return;
      syncAppLogoFromStorage();
    };

    const onLogoChanged = () => syncAppLogoFromStorage();

    window.addEventListener("storage", onStorage);
    window.addEventListener(APP_LOGO_CHANGED_EVENT, onLogoChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(APP_LOGO_CHANGED_EVENT, onLogoChanged);
    };
  }, []);

  return null;
}
