import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";
import type { GamePlanTimeoutCue } from "@/types/library-meta";

export const COUNTERS_DEMO_META = {
  opponent: "Panathinaikos",
  ourTeam: "Olympiacos BC",
  gameLabel: "EuroLeague — Round 28 (demo data)",
  gameDate: "2026-07-12",
  filmSessionTitle: "PAO @ OLY — Q2 scout cut",
  filmTimestamp: "5:42",
  filmClock: "Q2 · 5:42",
  clipLabel: "Horns → Spain PNR → weak-side flare",
  coachTags: ["Horns", "Spain PNR", "Flare", "ICE prep"],
  disruptionTag: "ICE on ball screen",
} as const;

export const COUNTERS_DEMO_FLOW = [
  {
    step: 1,
    title: "Scout film",
    detail: "Tag actions in Scouting, then Analyze clip with AI.",
    module: "Scouting",
  },
  {
    step: 2,
    title: "Pick counters",
    detail: "Select defensive counters matched to opponent patterns.",
    module: "Analyze modal",
  },
  {
    step: 3,
    title: "Apply to game plan",
    detail: "Timeout cues, tendencies, and film evidence land on the plan.",
    module: "Game plan",
  },
  {
    step: 4,
    title: "Game day & timeout",
    detail: "Bench card + timeout slides with BH / Big rules.",
    module: "Game day",
  },
  {
    step: 5,
    title: "Offense reads",
    detail: "When they counter us, link read frames from your library.",
    module: "Film evidence",
  },
  {
    step: 6,
    title: "Practice loop",
    detail: "Prep drills from weak reads; Coach dashboard tracks success.",
    module: "Coach dashboard",
  },
] as const;

export const COUNTERS_DEMO_ANALYSIS: FilmClipAnalysisResult = {
  summary:
    "Panathinaikos runs Horns into Spain PNR with a weak-side flare. Their ball handler prefers middle reject when you show high; they punish late ICE with a quick slip to the roller.",
  tendencies: [
    {
      kind: "halfcourt",
      label: "Spain PNR from Horns",
      confidence: 0.92,
      notes: "Screener sets at elbow, re-screens after first side.",
    },
    {
      kind: "halfcourt",
      label: "Weak-side flare after PNR",
      confidence: 0.84,
      notes: "Shooter lifts as help commits to roller.",
    },
    {
      kind: "halfcourt",
      label: "Middle reject vs show coverage",
      confidence: 0.78,
      notes: "Guard snakes back if nail helps early.",
    },
  ],
  playPatterns: [
    { tag: "Horns", confidence: 0.95, notes: "Dual elbow entry." },
    { tag: "Spain PNR", confidence: 0.91 },
    { tag: "Flare", confidence: 0.82 },
  ],
  coaching: {
    alternativeOptions: [
      {
        title: "Show early, recover to ICE",
        detail: "4 shows on first side, then ICE the re-screen to keep PAO on the sideline.",
        priority: "medium",
      },
    ],
    counters: [
      {
        title: "ICE Horns Spain",
        detail: "Force baseline on the re-screen; no middle reject. Weak-side stays home on flare.",
        coverage: "ice",
        targetsPattern: "Horns",
        trigger: "Spain re-screen at elbow",
        ballHandlerRule: "No middle — sideline only, high show then ICE",
        screenerRule: "Flat ICE angle; tag roller late",
        weakPoint: "Middle reject + quick slip",
        priority: "high",
      },
      {
        title: "Switch Spain side",
        detail: "Switch the first side early so ICE becomes a cross switch on the re-screen.",
        coverage: "switch",
        targetsPattern: "Spain PNR",
        trigger: "First side contact",
        ballHandlerRule: "Push switch; no reject lane",
        screenerRule: "Cross switch on re-screen",
        weakPoint: "Mismatch on slip",
        priority: "high",
      },
      {
        title: "Drop vs late Spain",
        detail: "If they ghost the first screen, drop big and stay attached to roller.",
        coverage: "drop",
        targetsPattern: "Spain PNR",
        trigger: "Ghost / empty side",
        ballHandlerRule: "Contain pull-up; no paint touch",
        screenerRule: "Drop at charge circle",
        weakPoint: "Pull-up in pocket",
        priority: "medium",
      },
    ],
    defensiveAdjustments: [
      {
        title: "Nail stunts on flare",
        detail: "Weak-side nail shows on catch; recover on pass fake only.",
        priority: "medium",
      },
    ],
    spacingFixes: [],
    timingCorrections: [
      {
        title: "ICE call timing",
        detail: "Call ICE before re-screen contact — late calls open the reject.",
        priority: "high",
      },
    ],
  },
  disruption: {
    detected: true,
    coverage: "ice",
    whatBroke: "Our Spain PNR middle lane — they forced baseline and killed the slip.",
    suggestedRead: "Reject / snake",
    summary: "When PAO ICEs our Spain, reject and re-attack baseline or snake back.",
    confidence: "high",
  },
};

export const COUNTERS_DEMO_TIMEOUT_CUES: GamePlanTimeoutCue[] = [
  {
    id: "demo-gtc-ice-horns",
    title: "ICE Horns Spain",
    detail:
      "Force baseline on the re-screen; no middle reject. Weak-side stays home on flare.",
    coverage: "ice",
    targetsPattern: "Horns",
    trigger: "Spain re-screen at elbow",
    ballHandlerRule: "No middle — sideline only",
    screenerRule: "Flat ICE angle; tag roller late",
    weakPoint: "Middle reject + quick slip",
    priority: "high",
    sourceFilmSessionId: "demo-film-session",
    sourceFilmTimestamp: 342,
    createdAt: "2026-07-05T12:00:00.000Z",
  },
  {
    id: "demo-gtc-switch-spain",
    title: "Switch Spain side",
    detail: "Switch the first side early so ICE becomes a cross switch on the re-screen.",
    coverage: "switch",
    targetsPattern: "Spain PNR",
    trigger: "First side contact",
    ballHandlerRule: "Push switch; no reject lane",
    screenerRule: "Cross switch on re-screen",
    weakPoint: "Mismatch on slip",
    priority: "high",
    sourceFilmSessionId: "demo-film-session",
    sourceFilmTimestamp: 342,
    createdAt: "2026-07-05T12:01:00.000Z",
  },
  {
    id: "demo-gtc-drop-spain",
    title: "Drop vs late Spain",
    detail: "If they ghost the first screen, drop big and stay attached to roller.",
    coverage: "drop",
    targetsPattern: "Spain PNR",
    trigger: "Ghost / empty side",
    ballHandlerRule: "Contain pull-up; no paint touch",
    screenerRule: "Drop at charge circle",
    weakPoint: "Pull-up in pocket",
    priority: "medium",
    sourceFilmSessionId: "demo-film-session",
    sourceFilmTimestamp: 342,
    createdAt: "2026-07-05T12:02:00.000Z",
  },
];

export const COUNTERS_DEMO_MATCHED_DEFENSE = [
  { title: "ICE — sideline force", tags: ["defense", "ice", "pnr"] },
  { title: "Switch all Spain", tags: ["defense", "switch"] },
  { title: "Drop big — contain", tags: ["defense", "drop"] },
] as const;

export const COUNTERS_DEMO_OFFENSE_READ = {
  coverage: "ice",
  coverageLabel: "ICE (force baseline)",
  pattern: "Spain PNR",
  readLabel: "Reject / snake",
  readDetail:
    "Reject the ball screen and re-attack baseline side or snake back before help rotates.",
  libraryMatch: "Spain PNR — Reject read",
  practiceSuccessPct: 62,
  landed: 18,
  missed: 11,
} as const;

export const COUNTERS_DEMO_PREP_ITEMS = [
  {
    id: "demo-prep-ice",
    call: "Spain ICE reject",
    reason: "62% success vs ICE — add 2×3-min live reads before game day.",
    coverage: "ice",
    blocks: 2,
  },
  {
    id: "demo-prep-switch",
    call: "Switch Spain slip",
    reason: "Coverage cue on plan — rep slip timing vs switch.",
    coverage: "switch",
    blocks: 1,
  },
] as const;

export const COUNTERS_DEMO_COACH_STATS = {
  overallReadRatePct: 62,
  totalLanded: 18,
  totalMissed: 11,
  weakReads: ["Spain ICE reject", "Horns flare read"],
  filmDisruptions: 4,
} as const;

export const COUNTERS_DEMO_APPLY_SUMMARY = {
  timeoutCuesAdded: 3,
  tendenciesAdded: 3,
  filmRefsAdded: 1,
  defensePlaysLinked: 2,
  offenseReadLinked: 1,
} as const;

export const COUNTERS_DEMO_REQUIREMENTS = [
  {
    id: "openai",
    label: "OPENAI_API_KEY configured",
    detail: "Enables Analyze clip in Scouting. Without it, counters must be entered manually.",
    required: true,
  },
  {
    id: "mp4",
    label: "MP4 upload preferred",
    detail: "YouTube analyze uses visible-player capture — MP4 gives cleaner frames for AI.",
    required: false,
  },
  {
    id: "game-plan",
    label: "Active game plan",
    detail: "Apply to game plan writes timeout cues and scout evidence to the selected plan.",
    required: true,
  },
  {
    id: "defense-tags",
    label: "Defensive plays tagged",
    detail: "Tag library plays with ice, switch, drop, etc. so Analyze can auto-match counters.",
    required: false,
  },
  {
    id: "offense-reads",
    label: "Offense read branches",
    detail: "Plays with reject / snake / slip frames link as timeout read slides.",
    required: false,
  },
  {
    id: "practice-live",
    label: "Practice Live marks",
    detail: "Mark landed / missed on reads to feed Coach dashboard and prep recommendations.",
    required: false,
  },
] as const;

export const COUNTERS_DEMO_SLIDE_IDS = [
  "intro",
  "scouting",
  "analyze",
  "apply",
  "gameday",
  "timeout",
  "offense-reads",
  "practice-loop",
  "requirements",
] as const;

export type CountersDemoSlideId = (typeof COUNTERS_DEMO_SLIDE_IDS)[number];

export const COUNTERS_DEMO_SLIDE_TITLES: Record<CountersDemoSlideId, string> = {
  intro: "What are counters?",
  scouting: "Step 1 — Scout the clip",
  analyze: "Step 2 — AI counter suggestions",
  apply: "Step 3 — Apply to game plan",
  "gameday": "Step 4 — Game day bench card",
  timeout: "Step 5 — Timeout mode",
  "offense-reads": "Step 6 — Offense reads",
  "practice-loop": "Step 7 — Practice loop",
  requirements: "Production checklist",
};
