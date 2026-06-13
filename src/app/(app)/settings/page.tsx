"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useSettingsStore } from "@/stores/settings-store";
import { isAdminUser } from "@/lib/auth/roles";
import { AdminSettingsPanel } from "@/components/settings/AdminSettingsPanel";
import { CoachSettingsPanel } from "@/components/settings/CoachSettingsPanel";

export default function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const refresh = useLibraryStore((s) => s.refresh);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) void refresh();
  }, [hydrated, refresh]);

  if (!session || !settingsHydrated) return null;

  if (isAdminUser(session.user)) {
    return <AdminSettingsPanel session={session} />;
  }

  return <CoachSettingsPanel session={session} />;
}
