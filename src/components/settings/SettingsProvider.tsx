"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return children;
}
