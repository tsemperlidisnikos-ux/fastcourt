"use client";

import { useSyncExternalStore } from "react";
import { APP_LOGO_PATH } from "@/lib/config";
import {
  APP_LOGO_CHANGED_EVENT,
  loadAppLogoDataUrl,
  resolveAppLogoSrc,
} from "@/lib/settings/app-logo";
import { useSettingsStore } from "@/stores/settings-store";

function readLogoSrc(): string {
  const fromStore = useSettingsStore.getState().appLogoDataUrl;
  return resolveAppLogoSrc(fromStore ?? loadAppLogoDataUrl());
}

function subscribeLogo(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onLogoEvent = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === "fastcourt_app_logo_v1") {
      onStoreChange();
    }
  };

  window.addEventListener(APP_LOGO_CHANGED_EVENT, onLogoEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(APP_LOGO_CHANGED_EVENT, onLogoEvent);
    window.removeEventListener("storage", onStorage);
  };
}

/** Logo src — custom admin logo is read synchronously on the client (no post-mount swap). */
export function useAppLogoSrc(): string {
  useSettingsStore((s) => s.appLogoDataUrl);

  return useSyncExternalStore(subscribeLogo, readLogoSrc, () => APP_LOGO_PATH);
}
