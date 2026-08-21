import { DEFAULT_NEW_PLAY_COURT_VIEW } from "@/lib/designer/court-view-settings";
import { DEFAULT_PLAYBACK_SPEED } from "@/lib/designer/animation-timing";
import { scheduleCloudLibrarySync } from "@/lib/cloud/library-sync";
import { getStoredPlay, putStoredPlay } from "@/lib/library/idb";
import { getActiveSessionUser } from "@/lib/library/library-scope";
import { stampPlayOwner } from "@/lib/library/play-ownership";
import { useAuthStore } from "@/stores/auth-store";
import type {
  DesignerAction,
  DesignerFrame,
  DesignerObject,
} from "@/types/designer";
import type { DefenseCounterMeta, StoredPlay } from "@/types/library";

/** Stable IDs — re-seed only inserts missing plays (never overwrites coach edits). */
export const COUNTER_LIBRARY_SEED_IDS = [
  "ctr_lib_ice_side_pnr",
  "ctr_lib_drop_weak_handle",
  "ctr_lib_blitz_elite_roller",
  "ctr_lib_hedge_recover",
  "ctr_lib_switch_cross_horns",
  "ctr_lib_show_horns",
  "ctr_lib_switch_spain",
  "ctr_lib_flare_nail",
  "ctr_lib_switch_dho",
  "ctr_lib_switch_blob",
  "ctr_lib_trap_slob",
  "ctr_lib_force_iso_left",
  "ctr_lib_front_post",
  "ctr_lib_zone_bump",
  "ctr_lib_press_sideline_trap",
] as const;

type Spot = { n: number; x: number; y: number; ball?: boolean };

type CounterSeedSpec = {
  id: (typeof COUNTER_LIBRARY_SEED_IDS)[number];
  title: string;
  coverages: string[];
  vsPatterns: string[];
  notes: string;
  playNotes: string;
  tags: string[];
  offense: Spot[];
  defense: Spot[];
  /** Optional screen / force arrow for the diagram. */
  actions?: Array<{
    type: DesignerAction["type"];
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
};

const SEED_UPDATED_AT = "2026-08-07T12:00:00.000Z";

function offenseObj(spot: Spot): DesignerObject {
  return {
    id: `o${spot.n}`,
    kind: "offense",
    x: spot.x,
    y: spot.y,
    label: String(spot.n),
    hasBall: Boolean(spot.ball),
  };
}

function defenseObj(spot: Spot): DesignerObject {
  return {
    id: `d${spot.n}`,
    kind: "defense",
    x: spot.x,
    y: spot.y,
    label: String(spot.n),
    defenseStyle: "mark",
  };
}

function buildFrame(spec: CounterSeedSpec): DesignerFrame {
  const objects = [
    ...spec.offense.map(offenseObj),
    ...spec.defense.map(defenseObj),
  ];
  const actions: DesignerAction[] = (spec.actions ?? []).map((action, index) => ({
    id: `a${index + 1}`,
    type: action.type,
    x1: action.x1,
    y1: action.y1,
    x2: action.x2,
    y2: action.y2,
  }));
  return {
    id: `${spec.id}-f1`,
    name: "Coverage",
    objects,
    actions,
    actionSequence: actions.map((action) => action.id),
  };
}

function defenseCounter(spec: CounterSeedSpec): DefenseCounterMeta {
  return {
    enabled: true,
    coverages: spec.coverages,
    vsPatterns: spec.vsPatterns,
    notes: spec.notes,
  };
}

function toStoredPlay(spec: CounterSeedSpec): StoredPlay {
  return {
    id: spec.id,
    title: spec.title,
    courtType: "half",
    courtView: { ...DEFAULT_NEW_PLAY_COURT_VIEW },
    frames: [buildFrame(spec)],
    animSpeed: DEFAULT_PLAYBACK_SPEED,
    animPauseMs: 800,
    type: "play",
    season: "2025-26",
    team: "Counter Library",
    series: "Defensive Counters",
    tags: ["counter", "defense", ...spec.tags],
    playNotes: spec.playNotes,
    defenseCounter: defenseCounter(spec),
    favorite: false,
    createdAt: SEED_UPDATED_AT,
    updatedAt: SEED_UPDATED_AT,
    source: "manual",
  };
}

/**
 * Real coaching counter pack — side PNR / Horns / Spain / DHO / BLOB / press etc.
 * Positions are half-court normalized (y↑ toward half line, basket near y≈0.08).
 */
export const COUNTER_LIBRARY_SEED_SPECS: CounterSeedSpec[] = [
  {
    id: "ctr_lib_ice_side_pnr",
    title: "ICE — Side PNR",
    coverages: ["ice"],
    vsPatterns: ["PNR"],
    notes: "Force baseline · deny middle reject",
    playNotes:
      "BH: top foot over, no middle. Big: drop to nail / short-roll lane; tag late if BH rejects. Weak: middle reject + slip when ICE is late.",
    tags: ["ice", "pnr"],
    offense: [
      { n: 1, x: 0.72, y: 0.58, ball: true },
      { n: 5, x: 0.62, y: 0.48 },
      { n: 2, x: 0.88, y: 0.22 },
      { n: 3, x: 0.18, y: 0.55 },
      { n: 4, x: 0.12, y: 0.18 },
    ],
    defense: [
      { n: 1, x: 0.68, y: 0.52 },
      { n: 5, x: 0.55, y: 0.38 },
      { n: 2, x: 0.84, y: 0.26 },
      { n: 3, x: 0.24, y: 0.52 },
      { n: 4, x: 0.18, y: 0.22 },
    ],
    actions: [
      { type: "screen", x1: 0.62, y1: 0.48, x2: 0.7, y2: 0.55 },
      { type: "dribble", x1: 0.72, y1: 0.58, x2: 0.82, y2: 0.42 },
    ],
  },
  {
    id: "ctr_lib_drop_weak_handle",
    title: "Drop — Weak Handle",
    coverages: ["drop"],
    vsPatterns: ["PNR"],
    notes: "Deep drop vs non-pull-up guard",
    playNotes:
      "BH: crowd the dribble, contest without leaving feet early. Big: drop to rim line; dig if BH turns corner. Weak: pull-up three / floater if drop is soft.",
    tags: ["drop", "pnr"],
    offense: [
      { n: 1, x: 0.5, y: 0.7, ball: true },
      { n: 5, x: 0.5, y: 0.5 },
      { n: 2, x: 0.15, y: 0.48 },
      { n: 3, x: 0.85, y: 0.48 },
      { n: 4, x: 0.78, y: 0.18 },
    ],
    defense: [
      { n: 1, x: 0.5, y: 0.62 },
      { n: 5, x: 0.5, y: 0.32 },
      { n: 2, x: 0.2, y: 0.48 },
      { n: 3, x: 0.8, y: 0.48 },
      { n: 4, x: 0.72, y: 0.22 },
    ],
    actions: [{ type: "screen", x1: 0.5, y1: 0.5, x2: 0.5, y2: 0.62 }],
  },
  {
    id: "ctr_lib_blitz_elite_roller",
    title: "Blitz — Elite Roller",
    coverages: ["blitz"],
    vsPatterns: ["PNR"],
    notes: "Trap BH · rotate to roller",
    playNotes:
      "BH: jump to the ball early, no split. Big: blitz high, then sprint recover / rotate. Weak: skip opposite if second helper is late.",
    tags: ["blitz", "trap", "pnr"],
    offense: [
      { n: 1, x: 0.62, y: 0.62, ball: true },
      { n: 5, x: 0.55, y: 0.5 },
      { n: 2, x: 0.88, y: 0.35 },
      { n: 3, x: 0.12, y: 0.5 },
      { n: 4, x: 0.2, y: 0.18 },
    ],
    defense: [
      { n: 1, x: 0.6, y: 0.55 },
      { n: 5, x: 0.58, y: 0.58 },
      { n: 2, x: 0.72, y: 0.28 },
      { n: 3, x: 0.22, y: 0.42 },
      { n: 4, x: 0.28, y: 0.22 },
    ],
    actions: [{ type: "screen", x1: 0.55, y1: 0.5, x2: 0.62, y2: 0.58 }],
  },
  {
    id: "ctr_lib_hedge_recover",
    title: "Hedge & Recover",
    coverages: ["hedge"],
    vsPatterns: ["PNR"],
    notes: "Soft hedge · sprint back to roller",
    playNotes:
      "BH: fight over / under by scouting report. Big: show at the level of the screen, then recover to roller. Weak: pocket pass if hedge stays too long.",
    tags: ["hedge", "pnr"],
    offense: [
      { n: 1, x: 0.68, y: 0.6, ball: true },
      { n: 5, x: 0.58, y: 0.48 },
      { n: 2, x: 0.88, y: 0.25 },
      { n: 3, x: 0.2, y: 0.55 },
      { n: 4, x: 0.15, y: 0.2 },
    ],
    defense: [
      { n: 1, x: 0.66, y: 0.54 },
      { n: 5, x: 0.62, y: 0.52 },
      { n: 2, x: 0.84, y: 0.28 },
      { n: 3, x: 0.26, y: 0.52 },
      { n: 4, x: 0.22, y: 0.24 },
    ],
    actions: [{ type: "screen", x1: 0.58, y1: 0.48, x2: 0.66, y2: 0.56 }],
  },
  {
    id: "ctr_lib_switch_cross_horns",
    title: "Switch Cross — Horns",
    coverages: ["switch_cross"],
    vsPatterns: ["Horns"],
    notes: "Cross-switch first gap · deny middle cut",
    playNotes:
      "BH: switch early, stay square. Big: show briefly then communicate cross. Weak: backdoor / short roll if switch is late.",
    tags: ["switch", "horns"],
    offense: [
      { n: 1, x: 0.5, y: 0.78, ball: true },
      { n: 4, x: 0.38, y: 0.48 },
      { n: 5, x: 0.62, y: 0.48 },
      { n: 2, x: 0.15, y: 0.55 },
      { n: 3, x: 0.85, y: 0.55 },
    ],
    defense: [
      { n: 1, x: 0.5, y: 0.7 },
      { n: 4, x: 0.42, y: 0.52 },
      { n: 5, x: 0.58, y: 0.52 },
      { n: 2, x: 0.2, y: 0.55 },
      { n: 3, x: 0.8, y: 0.55 },
    ],
    actions: [
      { type: "screen", x1: 0.38, y1: 0.48, x2: 0.48, y2: 0.7 },
      { type: "cut", x1: 0.62, y1: 0.48, x2: 0.5, y2: 0.28 },
    ],
  },
  {
    id: "ctr_lib_show_horns",
    title: "Hard Show — Horns",
    coverages: ["hard_show", "show"],
    vsPatterns: ["Horns"],
    notes: "Hard show first elbow · nail stays home",
    playNotes:
      "BH: fight over/under by shooter grade. Big: hard show then sprint recover. Weak: Spain / second action if recover is slow.",
    tags: ["show", "horns"],
    offense: [
      { n: 1, x: 0.5, y: 0.78, ball: true },
      { n: 4, x: 0.38, y: 0.48 },
      { n: 5, x: 0.62, y: 0.48 },
      { n: 2, x: 0.12, y: 0.4 },
      { n: 3, x: 0.88, y: 0.4 },
    ],
    defense: [
      { n: 1, x: 0.48, y: 0.7 },
      { n: 4, x: 0.45, y: 0.62 },
      { n: 5, x: 0.58, y: 0.4 },
      { n: 2, x: 0.18, y: 0.4 },
      { n: 3, x: 0.82, y: 0.4 },
    ],
    actions: [{ type: "screen", x1: 0.38, y1: 0.48, x2: 0.48, y2: 0.7 }],
  },
  {
    id: "ctr_lib_switch_spain",
    title: "Switch — Spain PNR",
    coverages: ["switch"],
    vsPatterns: ["Spain", "PNR"],
    notes: "Switch back-screen · tag roller · no open corner",
    playNotes:
      "BH: stay attached through switch. Big: tag roller then find shooter. Weak: corner three if tag overhelps.",
    tags: ["switch", "spain", "pnr"],
    offense: [
      { n: 1, x: 0.65, y: 0.58, ball: true },
      { n: 5, x: 0.55, y: 0.45 },
      { n: 4, x: 0.48, y: 0.32 },
      { n: 2, x: 0.88, y: 0.2 },
      { n: 3, x: 0.15, y: 0.5 },
    ],
    defense: [
      { n: 1, x: 0.62, y: 0.52 },
      { n: 5, x: 0.52, y: 0.4 },
      { n: 4, x: 0.5, y: 0.36 },
      { n: 2, x: 0.82, y: 0.24 },
      { n: 3, x: 0.22, y: 0.48 },
    ],
    actions: [
      { type: "screen", x1: 0.55, y1: 0.45, x2: 0.64, y2: 0.55 },
      { type: "screen", x1: 0.48, y1: 0.32, x2: 0.55, y2: 0.42 },
    ],
  },
  {
    id: "ctr_lib_flare_nail",
    title: "Switch / Nail — Flare",
    coverages: ["switch"],
    vsPatterns: ["Flare"],
    notes: "Chase or switch · nail dig on catch",
    playNotes:
      "BH: chase or switch — high hand on catch. Screener defender: bump cutter, no free curl. Weak: catch-and-shoot if closeout soft.",
    tags: ["flare", "switch"],
    offense: [
      { n: 1, x: 0.5, y: 0.72, ball: true },
      { n: 2, x: 0.35, y: 0.45 },
      { n: 4, x: 0.42, y: 0.38 },
      { n: 3, x: 0.85, y: 0.5 },
      { n: 5, x: 0.7, y: 0.25 },
    ],
    defense: [
      { n: 1, x: 0.5, y: 0.65 },
      { n: 2, x: 0.28, y: 0.42 },
      { n: 4, x: 0.4, y: 0.42 },
      { n: 3, x: 0.8, y: 0.48 },
      { n: 5, x: 0.65, y: 0.28 },
    ],
    actions: [
      { type: "screen", x1: 0.42, y1: 0.38, x2: 0.32, y2: 0.45 },
      { type: "cut", x1: 0.35, y1: 0.45, x2: 0.18, y2: 0.35 },
    ],
  },
  {
    id: "ctr_lib_switch_dho",
    title: "Switch — DHO",
    coverages: ["switch", "ice"],
    vsPatterns: ["DHO"],
    notes: "Switch handoff or ICE weak side",
    playNotes:
      "BH: top-side deny; force baseline or switch clean. Big: contact on handoff; no free snake. Weak: reject / snake middle if top side soft.",
    tags: ["dho", "switch"],
    offense: [
      { n: 1, x: 0.42, y: 0.55, ball: true },
      { n: 2, x: 0.55, y: 0.55 },
      { n: 5, x: 0.5, y: 0.35 },
      { n: 3, x: 0.88, y: 0.4 },
      { n: 4, x: 0.12, y: 0.22 },
    ],
    defense: [
      { n: 1, x: 0.4, y: 0.5 },
      { n: 2, x: 0.52, y: 0.5 },
      { n: 5, x: 0.5, y: 0.38 },
      { n: 3, x: 0.82, y: 0.4 },
      { n: 4, x: 0.18, y: 0.25 },
    ],
    actions: [{ type: "handoff", x1: 0.42, y1: 0.55, x2: 0.55, y2: 0.55 }],
  },
  {
    id: "ctr_lib_switch_blob",
    title: "Switch All — BLOB",
    coverages: ["switch"],
    vsPatterns: ["BLOB"],
    notes: "Switch stack screens · box out",
    playNotes:
      "Deny first cut; switch early on screens. Zone bump / switch stack; protect rim. Weak: lobs and corner threes on late switches.",
    tags: ["blob", "switch"],
    offense: [
      { n: 1, x: 0.5, y: 0.02 },
      { n: 4, x: 0.35, y: 0.18 },
      { n: 5, x: 0.65, y: 0.18 },
      { n: 2, x: 0.22, y: 0.35 },
      { n: 3, x: 0.78, y: 0.35 },
    ],
    defense: [
      { n: 1, x: 0.5, y: 0.12 },
      { n: 4, x: 0.38, y: 0.22 },
      { n: 5, x: 0.62, y: 0.22 },
      { n: 2, x: 0.28, y: 0.35 },
      { n: 3, x: 0.72, y: 0.35 },
    ],
    actions: [
      { type: "screen", x1: 0.35, y1: 0.18, x2: 0.28, y2: 0.3 },
      { type: "cut", x1: 0.22, y1: 0.35, x2: 0.45, y2: 0.12 },
    ],
  },
  {
    id: "ctr_lib_trap_slob",
    title: "Trap — First SLOB",
    coverages: ["trap"],
    vsPatterns: ["SLOB"],
    notes: "Trap / switch first action · no open corner",
    playNotes:
      "Force sideline; no middle. Trap / switch then rotate to corner. Weak: skip to opposite corner.",
    tags: ["slob", "trap"],
    offense: [
      { n: 1, x: 0.02, y: 0.55 },
      { n: 2, x: 0.18, y: 0.55, ball: true },
      { n: 4, x: 0.22, y: 0.42 },
      { n: 3, x: 0.5, y: 0.7 },
      { n: 5, x: 0.75, y: 0.25 },
    ],
    defense: [
      { n: 1, x: 0.08, y: 0.52 },
      { n: 2, x: 0.16, y: 0.5 },
      { n: 4, x: 0.28, y: 0.42 },
      { n: 3, x: 0.45, y: 0.55 },
      { n: 5, x: 0.7, y: 0.28 },
    ],
    actions: [
      { type: "screen", x1: 0.22, y1: 0.42, x2: 0.18, y2: 0.52 },
      { type: "pass", x1: 0.02, y1: 0.55, x2: 0.18, y2: 0.55 },
    ],
  },
  {
    id: "ctr_lib_force_iso_left",
    title: "Force Left — ISO",
    coverages: ["other"],
    vsPatterns: ["ISO"],
    notes: "Shade weak hand · nail help only",
    playNotes:
      "Body up — force weak hand / baseline. Nail dig only; sprint back to corner. Weak: middle drive if shade is soft.",
    tags: ["iso"],
    offense: [
      { n: 1, x: 0.55, y: 0.55, ball: true },
      { n: 2, x: 0.12, y: 0.45 },
      { n: 3, x: 0.88, y: 0.45 },
      { n: 4, x: 0.15, y: 0.18 },
      { n: 5, x: 0.85, y: 0.18 },
    ],
    defense: [
      { n: 1, x: 0.52, y: 0.5 },
      { n: 2, x: 0.18, y: 0.45 },
      { n: 3, x: 0.82, y: 0.45 },
      { n: 4, x: 0.22, y: 0.22 },
      { n: 5, x: 0.78, y: 0.22 },
    ],
    actions: [{ type: "dribble", x1: 0.55, y1: 0.55, x2: 0.42, y2: 0.35 }],
  },
  {
    id: "ctr_lib_front_post",
    title: "Front the Post",
    coverages: ["other"],
    vsPatterns: ["Post"],
    notes: "3/4 front · dig late · wall drop step",
    playNotes:
      "Deny high-low; dig late if needed. Front / 3/4 deny; wall off drop step. Weak: lob over top or kick-out three.",
    tags: ["post"],
    offense: [
      { n: 5, x: 0.62, y: 0.22 },
      { n: 1, x: 0.45, y: 0.55, ball: true },
      { n: 2, x: 0.15, y: 0.45 },
      { n: 3, x: 0.88, y: 0.4 },
      { n: 4, x: 0.75, y: 0.55 },
    ],
    defense: [
      { n: 5, x: 0.58, y: 0.18 },
      { n: 1, x: 0.45, y: 0.48 },
      { n: 2, x: 0.2, y: 0.45 },
      { n: 3, x: 0.82, y: 0.4 },
      { n: 4, x: 0.7, y: 0.4 },
    ],
    actions: [{ type: "pass", x1: 0.45, y1: 0.55, x2: 0.62, y2: 0.22 }],
  },
  {
    id: "ctr_lib_zone_bump",
    title: "Zone Bump — Overload",
    coverages: ["zone_bump"],
    vsPatterns: ["Zone"],
    notes: "Bump cutters · find gap shooter early",
    playNotes:
      "Close gaps on skip; high hand. Bump cutters; no free flash to middle. Weak: gap threes between zones.",
    tags: ["zone"],
    offense: [
      { n: 1, x: 0.35, y: 0.65, ball: true },
      { n: 2, x: 0.2, y: 0.4 },
      { n: 3, x: 0.15, y: 0.18 },
      { n: 4, x: 0.45, y: 0.35 },
      { n: 5, x: 0.75, y: 0.5 },
    ],
    defense: [
      { n: 1, x: 0.4, y: 0.55 },
      { n: 2, x: 0.28, y: 0.35 },
      { n: 3, x: 0.25, y: 0.2 },
      { n: 4, x: 0.55, y: 0.35 },
      { n: 5, x: 0.7, y: 0.45 },
    ],
    actions: [
      { type: "cut", x1: 0.45, y1: 0.35, x2: 0.35, y2: 0.2 },
      { type: "pass", x1: 0.35, y1: 0.65, x2: 0.15, y2: 0.18 },
    ],
  },
  {
    id: "ctr_lib_press_sideline_trap",
    title: "Press — Sideline Trap",
    coverages: ["trap"],
    vsPatterns: ["Press"],
    notes: "Trap sideline · deny middle · sprint matchups",
    playNotes:
      "Force sideline; no middle split. Second trapper on bounce; rotate back. Weak: long outlet / middle split.",
    tags: ["press", "trap"],
    offense: [
      { n: 1, x: 0.2, y: 0.75, ball: true },
      { n: 2, x: 0.35, y: 0.55 },
      { n: 3, x: 0.7, y: 0.7 },
      { n: 4, x: 0.5, y: 0.35 },
      { n: 5, x: 0.8, y: 0.25 },
    ],
    defense: [
      { n: 1, x: 0.18, y: 0.7 },
      { n: 2, x: 0.26, y: 0.72 },
      { n: 3, x: 0.45, y: 0.55 },
      { n: 4, x: 0.55, y: 0.4 },
      { n: 5, x: 0.75, y: 0.3 },
    ],
    actions: [{ type: "dribble", x1: 0.2, y1: 0.75, x2: 0.15, y2: 0.55 }],
  },
];

export const COUNTER_LIBRARY_SEED_PLAYS: StoredPlay[] =
  COUNTER_LIBRARY_SEED_SPECS.map(toStoredPlay);

function withSeedOwner(play: StoredPlay): StoredPlay {
  const user =
    getActiveSessionUser() ?? useAuthStore.getState().session?.user ?? null;
  return user ? stampPlayOwner(play, user) : play;
}

/**
 * Insert missing Counter Library starters (never overwrites existing IDs).
 * @returns number of plays newly added
 */
export async function ensureCounterLibrarySeedPlays(): Promise<number> {
  let added = 0;
  for (const seed of COUNTER_LIBRARY_SEED_PLAYS) {
    const existing = await getStoredPlay(seed.id);
    if (existing) continue;
    await putStoredPlay(withSeedOwner({ ...seed }));
    added += 1;
  }
  if (added > 0) {
    void scheduleCloudLibrarySync();
  }
  return added;
}
