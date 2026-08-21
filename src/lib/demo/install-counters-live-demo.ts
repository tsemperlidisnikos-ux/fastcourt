import { COUNTERS_DEMO_META } from "@/lib/demo/counters-demo-data";
import { createOpponentTendency } from "@/lib/game-plan/opponent-board";
import {
  mergeTimeoutCues,
  timeoutCueFromCounterLibraryPlay,
} from "@/lib/game-plan/game-day-timeout-cues";
import {
  normalizeGamePlan,
} from "@/lib/game-plan/game-plan-items";
import { getGamePlans, setGamePlans } from "@/lib/library/meta";
import {
  COUNTER_LIBRARY_SEED_PLAYS,
  ensureCounterLibrarySeedPlays,
} from "@/lib/library/starter-plays/seed-counter-library";
import { scheduleCloudLibrarySync } from "@/lib/cloud/library-sync";
import type { GamePlan, GamePlanEntry, GamePlanTimeoutCue } from "@/types/library-meta";

/** Stable demo plan id — reinstall replaces this plan only. */
export const COUNTERS_LIVE_DEMO_PLAN_ID = "gp_counters_live_demo_v1";

/** Counter Library seed plays wired into the live demo plan. */
const DEMO_COUNTER_PLAY_IDS = [
  "ctr_lib_ice_side_pnr",
  "ctr_lib_switch_spain",
  "ctr_lib_drop_weak_handle",
  "ctr_lib_switch_cross_horns",
  "ctr_lib_blitz_elite_roller",
] as const;

function buildDemoTimeoutCues(): GamePlanTimeoutCue[] {
  const byId = new Map(COUNTER_LIBRARY_SEED_PLAYS.map((play) => [play.id, play]));
  const cues: GamePlanTimeoutCue[] = [];
  for (const playId of DEMO_COUNTER_PLAY_IDS) {
    const play = byId.get(playId);
    if (!play) continue;
    const cue = timeoutCueFromCounterLibraryPlay(play);
    if (!cue) continue;
    // Enrich with demo film + coaching rules from notes.
    cues.push({
      ...cue,
      id: `demo_gtc_${playId}`,
      priority:
        playId === "ctr_lib_drop_weak_handle" || playId === "ctr_lib_blitz_elite_roller"
          ? "medium"
          : "high",
      trigger:
        playId === "ctr_lib_ice_side_pnr"
          ? "Spain re-screen at elbow / side PNR"
          : playId === "ctr_lib_switch_spain"
            ? "Back-screen after PNR (Spain)"
            : playId === "ctr_lib_switch_cross_horns"
              ? "Horns entry into first gap"
              : cue.trigger,
      ballHandlerRule:
        play.playNotes?.match(/BH:\s*([^.]+)/i)?.[1]?.trim() || cue.ballHandlerRule,
      screenerRule:
        play.playNotes?.match(/Big:\s*([^.]+)/i)?.[1]?.trim() || cue.screenerRule,
      sourceFilmSessionId: "demo-film-session",
      sourceFilmTimestamp: 342,
    });
  }
  return mergeTimeoutCues(undefined, cues);
}

function buildDemoDefenseEntries(): GamePlanEntry[] {
  return DEMO_COUNTER_PLAY_IDS.map((playId, index) => ({
    id: `demo_gpe_def_${index + 1}`,
    categoryId: "defense" as const,
    playId,
    callName:
      COUNTER_LIBRARY_SEED_PLAYS.find((play) => play.id === playId)?.title ??
      "Counter",
  }));
}

function buildDemoHalfcourtEntries(): GamePlanEntry[] {
  // Placeholder offense slots so Game Day categories aren't empty.
  return [
    {
      id: "demo_gpe_ato_1",
      categoryId: "ato",
      callName: "ATO — Quick",
      notes: "Demo placeholder — replace with your ATO.",
    },
    {
      id: "demo_gpe_hc_1",
      categoryId: "halfcourt",
      callName: "Horns Spain",
      notes: "Opponent primary — see Timeout counters for coverage.",
    },
  ];
}

/** Build the complete live demo game plan document. */
export function buildCountersLiveDemoPlan(): GamePlan {
  const now = new Date().toISOString();
  const gameDate =
    COUNTERS_DEMO_META.gameDate || now.slice(0, 10);

  return normalizeGamePlan({
    id: COUNTERS_LIVE_DEMO_PLAN_ID,
    title: `DEMO · vs ${COUNTERS_DEMO_META.opponent}`,
    opponent: COUNTERS_DEMO_META.opponent,
    gameDate,
    team: COUNTERS_DEMO_META.ourTeam,
    location: "Peace and Friendship Stadium",
    homeAway: "home",
    status: "ready",
    scoutingNotes: [
      "Keys: ICE side PNR / Spain — no middle reject.",
      "Weak-side stay home on flare after Spain.",
      "Timeout 1: Switch Spain if ICE is late.",
      "Demo plan — edit or delete anytime.",
    ].join("\n"),
    entries: [...buildDemoDefenseEntries(), ...buildDemoHalfcourtEntries()],
    opponentBoard: [
      createOpponentTendency(
        "halfcourt",
        "Spain PNR from Horns",
        "Screener sets at elbow, re-screens after first side.",
      ),
      createOpponentTendency(
        "halfcourt",
        "Weak-side flare after PNR",
        "Shooter lifts as help commits to roller.",
      ),
      createOpponentTendency(
        "halfcourt",
        "Middle reject vs show",
        "Guard snakes back if nail helps early.",
      ),
    ],
    timeoutCues: buildDemoTimeoutCues(),
    filmRefs: [
      {
        id: "demo_film_ref_1",
        sessionId: "demo-film-session",
        timestamp: 342,
        label: COUNTERS_DEMO_META.clipLabel,
        detail: "Horns → Spain PNR → weak-side flare (demo clip marker)",
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  });
}

export type InstallCountersLiveDemoResult = {
  success: true;
  planId: string;
  counterPlaysAdded: number;
  timeoutCueCount: number;
  defenseEntryCount: number;
};

/**
 * Seeds Counter Library + upserts a ready Game Plan with timeout counters,
 * defense links, opponent board, and scouting keys.
 */
export async function installCountersLiveDemo(): Promise<InstallCountersLiveDemoResult> {
  const counterPlaysAdded = await ensureCounterLibrarySeedPlays();
  const plan = buildCountersLiveDemoPlan();
  const existing = await getGamePlans();
  const next = [plan, ...existing.filter((row) => row.id !== plan.id)];
  await setGamePlans(next);

  // Refresh in-memory stores if available (browser).
  try {
    const { useOrganizerStore } = await import("@/stores/organizer-store");
    const { useLibraryStore } = await import("@/stores/library-store");
    useOrganizerStore.setState({ gamePlans: next });
    await useLibraryStore.getState().refresh();
    const plays = useLibraryStore.getState().items;
    // Keep organizer plays in sync after seed.
    const { listStoredPlays } = await import("@/lib/library/idb");
    const stored = await listStoredPlays();
    useOrganizerStore.setState({ plays: stored });
    void plays;
  } catch {
    // Non-browser / store unavailable — persistence already done.
  }

  void scheduleCloudLibrarySync();

  return {
    success: true,
    planId: plan.id,
    counterPlaysAdded,
    timeoutCueCount: plan.timeoutCues?.length ?? 0,
    defenseEntryCount: plan.entries.filter((e) => e.categoryId === "defense")
      .length,
  };
}

/** Deep link after install. */
export function countersLiveDemoHref(planId = COUNTERS_LIVE_DEMO_PLAN_ID) {
  return `/library?tab=gameplan&plan=${encodeURIComponent(planId)}`;
}
