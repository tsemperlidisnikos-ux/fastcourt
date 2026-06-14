"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DrawLibraryView } from "@/components/library/DrawLibraryView";
import { FdAppFooter, FdAppHeader } from "@/components/library/FdAppHeader";
import { FieldsView } from "@/components/library/FieldsView";
import {
  LibraryLoadError,
  LibraryLoadingState,
} from "@/components/library/LibraryLoadError";
import { OnboardingModal } from "@/components/library/OnboardingModal";
import { PlaybooksView } from "@/components/library/PlaybooksView";
import { PracticePlannerView } from "@/components/library/PracticePlannerView";
import { PlayersView } from "@/components/library/PlayersView";
import { TrialBanner } from "@/components/billing/TrialBanner";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useDeviceClass } from "@/hooks/useDeviceClass";
import {
  dismissOnboardingForever,
  isOnboardingDismissed,
  shouldShowOnboarding,
  stripWelcomeFromPath,
} from "@/lib/auth/onboarding";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useSettingsStore } from "@/stores/settings-store";

type LibraryTab = "draw" | "playbooks" | "fields" | "practice" | "players";

function parseTab(raw: string | null): LibraryTab {
  if (
    raw === "playbooks" ||
    raw === "fields" ||
    raw === "practice" ||
    raw === "players"
  ) {
    return raw;
  }
  return "draw";
}

const SECTION_LABEL: Record<LibraryTab, string> = {
  draw: "PLAYS",
  playbooks: "PLAYBOOKS",
  fields: "FIELDS",
  practice: "PRACTICE",
  players: "PLAYERS",
};

export function LibraryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const mounted = useClientMounted();
  const [onboardingSuppressed, setOnboardingSuppressed] = useState(false);
  const onboardingOpen =
    mounted &&
    !onboardingSuppressed &&
    !isOnboardingDismissed() &&
    shouldShowOnboarding(searchParams.get("welcome"), false);

  const hydrated = useLibraryStore((s) => s.hydrated);
  const loading = useLibraryStore((s) => s.loading);
  const error = useLibraryStore((s) => s.error);
  const refresh = useLibraryStore((s) => s.refresh);
  const metaHydrated = useOrganizerStore((s) => s.hydrated);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);

  const applySettings = useSettingsStore((s) => s.applyAll);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const session = useAuthStore((s) => s.session);

  const deviceClass = useDeviceClass();

  useEffect(() => {
    if (!settingsHydrated) hydrateSettings();
  }, [settingsHydrated, hydrateSettings]);

  useEffect(() => {
    applySettings();
  }, [applySettings, tab]);

  useEffect(() => {
    if (!hydrated) void refresh();
  }, [hydrated, refresh]);

  useEffect(() => {
    if (!metaHydrated) void loadMeta();
  }, [metaHydrated, loadMeta]);

  function closeOnboarding() {
    setOnboardingSuppressed(true);
    dismissOnboardingForever();
    const clean = stripWelcomeFromPath(pathname, searchParams.toString());
    router.replace(clean, { scroll: false });
  }

  function runOnboardingAction(action: "new" | "import") {
    setOnboardingSuppressed(true);
    dismissOnboardingForever();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    params.set("tab", "draw");
    params.set(action, "1");
    router.replace(`/library?${params.toString()}`, { scroll: false });
  }

  const modeClass =
    [
      tab === "draw"
        ? "library-draw-mode"
        : tab === "fields"
          ? "library-fields-mode"
          : tab === "playbooks"
            ? "library-playbooks-mode"
            : tab === "players"
              ? "library-players-mode"
              : "library-practice-mode",
      deviceClass === "tablet" ? "library-tablet-mode fc-fd-tablet-shell" : "",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div
      className={`fd-ui screen-root active${modeClass ? ` ${modeClass}` : ""}`}
      id="screen-organizer"
    >
      <FdAppHeader sectionLabel={SECTION_LABEL[tab]} activeTab={tab} />
      <div className="org-body">
        {session?.user ? <TrialBanner user={session.user} /> : null}
        {error ? (
          <LibraryLoadError
            message={error}
            onRetry={() => void refresh()}
          />
        ) : !hydrated && loading ? (
          <LibraryLoadingState />
        ) : tab === "practice" ? (
          <div className="org-practice-shell-wrap" id="org-practice-shell-wrap">
            <PracticePlannerView />
          </div>
        ) : tab === "players" ? (
          <div className="org-players-shell-wrap" id="org-players-shell-wrap">
            <PlayersView />
          </div>
        ) : (
          <div className="org-library-shell" id="org-library-shell">
            {tab === "draw" ? <DrawLibraryView /> : null}
            {tab === "fields" ? <FieldsView /> : null}
            {tab === "playbooks" ? <PlaybooksView /> : null}
          </div>
        )}
      </div>
      <FdAppFooter />
      <OnboardingModal
        open={onboardingOpen}
        onClose={closeOnboarding}
        onNewPlay={() => runOnboardingAction("new")}
        onImportFdb={() => runOnboardingAction("import")}
      />
    </div>
  );
}
