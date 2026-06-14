"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSettingsStore } from "@/stores/settings-store";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const hydrate = useSettingsStore((s) => s.hydrate);
  const hydrateForUser = useSettingsStore((s) => s.hydrateForUser);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    const user = useAuthStore.getState().session?.user;
    if (user) {
      void hydrateForUser(user);
      return;
    }
    hydrate();
  }, [userId, hydrate, hydrateForUser]);

  return children;
}
