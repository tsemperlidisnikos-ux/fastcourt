/**
 * Feature domain map for health-check & full-app-check reports.
 * Each domain groups unit test files and core source modules.
 */

/** @type {Array<{id:string,name:string,tests:string[],modules?:string[]}>} */
export const FEATURE_DOMAINS = [
  {
    id: "infrastructure",
    name: "Infrastructure & Routes",
    tests: ["app-structure.test.ts", "env-config.test.ts"],
    modules: [
      "src/app/page.tsx",
      "src/app/login/page.tsx",
      "src/lib/supabase/env.ts",
      "public/sw.js",
      "public/offline.html",
      "src/components/pwa/PwaBootstrap.tsx",
    ],
  },
  {
    id: "auth",
    name: "Auth & Access",
    tests: [
      "device-access.test.ts",
      "safe-next-path.test.ts",
      "stripe-access.test.ts",
      "team-org-access.test.ts",
    ],
    modules: [
      "src/stores/auth-store.ts",
      "src/components/auth/LoginForm.tsx",
      "src/lib/auth/access.ts",
      "src/lib/auth/safe-next-path.ts",
    ],
  },
  {
    id: "library",
    name: "Library & Plays",
    tests: [
      "library-modules.test.ts",
      "library-merge.test.ts",
      "library-meta-merge.test.ts",
      "library-tombstones.test.ts",
      "library-play-ownership.test.ts",
      "library-user-isolation.test.ts",
      "library-backup-import.test.ts",
      "practice-missing-play.test.ts",
      "practice-templates.test.ts",
      "video-url.test.ts",
    ],
    modules: [
      "src/stores/library-store.ts",
      "src/components/library/LibraryScreen.tsx",
      "src/components/library/DrawLibraryView.tsx",
      "src/lib/library/convert.ts",
      "src/lib/library/play-ownership.ts",
      "src/lib/library/library-cache-policy.ts",
      "src/lib/settings/library-backup.ts",
      "src/lib/cloud/library-sync.ts",
      "src/lib/practice/practice-items.ts",
      "src/lib/practice/templates.ts",
    ],
  },
  {
    id: "designer-lines",
    name: "Designer — Line Snap",
    tests: [
      "designer-dribble-geometry.test.ts",
      "designer-line-snap.test.ts",
      "designer-snap.test.ts",
      "screen-bar-geometry.test.ts",
    ],
    modules: [
      "src/lib/designer/player-edge-snap.ts",
      "src/lib/designer/action-geometry.ts",
    ],
  },
  {
    id: "designer-propagation",
    name: "Designer — Frame Propagation",
    tests: ["designer-propagation.test.ts", "frame-action-state.test.ts"],
    modules: [
      "src/lib/designer/action-propagation.ts",
      "src/lib/designer/frame-propagation.ts",
    ],
  },
  {
    id: "designer-visual",
    name: "Designer — Thumbnails & Animation",
    tests: [
      "court-hg-visual.test.ts",
      "court-vector-geometry.test.ts",
      "designer-thumbnail.test.ts",
      "designer-animation.test.ts",
      "thumbnail-objects.test.ts",
      "designer-mirror.test.ts",
      "designer-action-convert.test.ts",
    ],
    modules: [
      "src/lib/designer/thumbnail-objects.ts",
      "src/lib/designer/court-vector-geometry.ts",
      "src/lib/designer/court-hg-templates.ts",
      "src/components/designer/CourtFrameThumbnail.tsx",
      "src/components/designer/VectorCourtFloor.tsx",
    ],
  },
  {
    id: "designer-ui",
    name: "Designer — UI Shell",
    tests: [
      "designer-ui.test.ts",
      "player-limits.test.ts",
      "designer-document-snapshot.test.ts",
      "stroke-partial-eraser.test.ts",
    ],
    modules: [
      "src/components/designer/DesignerScreen.tsx",
      "src/stores/designer-store.ts",
      "src/stores/designer/helpers.ts",
      "src/lib/designer/designer-document-snapshot.ts",
      "src/lib/designer/use-designer-unsaved-guard.ts",
      "src/lib/designer/stroke-partial-eraser.ts",
      "src/lib/designer/whiteboard-eraser.ts",
    ],
  },
  {
    id: "settings",
    name: "Settings & Branding",
    tests: [
      "org-branding.test.ts",
      "pdf-brand-export.test.ts",
      "color-contrast.test.ts",
      "landing-pricing-config.test.ts",
    ],
    modules: [
      "src/stores/settings-store.ts",
      "src/lib/settings/appearance-settings.ts",
      "src/lib/settings/pdf-brand-export.ts",
      "src/lib/settings/billing-config.ts",
      "src/lib/landing/pricing.ts",
    ],
  },
  {
    id: "film-ai",
    name: "Film Room — AI Assistant",
    tests: [
      "film-clip-analyze.test.ts",
      "apply-ai-scout.test.ts",
      "ai-play-pattern-match.test.ts",
      "ai-openai-env.test.ts",
    ],
    modules: [
      "src/app/api/film/analyze/route.ts",
      "src/app/api/film/analyze/status/route.ts",
      "src/components/film-room/FilmRoomAnalyzeModal.tsx",
      "src/lib/film-room/apply-ai-scout-to-game-plan.ts",
      "src/lib/film-room/ai-play-pattern-match.ts",
      "src/lib/ai/env.ts",
    ],
  },
  {
    id: "admin",
    name: "Admin & Data",
    tests: ["purge-data.test.ts"],
    modules: ["src/lib/admin/purge-application-data.ts"],
  },
];

/** @type {Array<{area:string,steps:string[]}>} */
export const MANUAL_CHECKLIST = [
  {
    area: "Login / Auth",
    steps: [
      "Email/password login (local + cloud if configured)",
      "OAuth buttons when cloud is on",
      "Signup wizard completes and redirects to library",
      "Team invite link pre-fills on login page",
    ],
  },
  {
    area: "Library",
    steps: [
      "Create new play, open in designer",
      "Import .fdb file, preview thumbnails render",
      "Playbooks tab: present / print / share",
      "Practice tab: create session, live timer",
      "Players tab: roster list loads",
    ],
  },
  {
    area: "Designer",
    steps: [
      "Place O/D players, assign ball (tap player)",
      "Draw pass → next frame → ball on receiver",
      "Dribble + pass chain, handoff, cut, screen",
      "Formations & FastBuild apply correctly",
      "Undo/redo, frame duplicate, mirror frame/play",
      "Animation playback timing & ball transfer",
      "Export MP4 from Animation tab (Chrome/Edge)",
      "Whiteboard ink + eraser on frame",
      "Clear frame modal — black text on Cancel/Clear",
    ],
  },
  {
    area: "Film Room — AI Assistant",
    steps: [
      "Set OPENAI_API_KEY in .env.local or Vercel env vars",
      "Upload MP4 clip (not YouTube-only for analyze)",
      "Film Room → Analyze clip → AI scout read modal",
      "Apply full scout → game plan opponent board + defense/offense plays",
    ],
  },
  {
    area: "Settings / Admin",
    steps: [
      "Coach subscription & PDF branding save",
      "Admin users CRUD (if admin role)",
      "Appearance settings persist after reload",
    ],
  },
];
