/** QA checklist source data — used by scripts/generate-qa-checklists.mjs */

export const QA_META = {
  product: "FastCourt",
  version: "ea047b7",
  productionUrl: "https://fastcourt.eu",
  generatedNote: "Pass: Y / N / N/A — fill in Excel or print HTML to PDF",
};

/** @typedef {{ id: string, item: string, steps?: string, expected?: string, priority?: 'P0'|'P1'|'P2' }} CheckItem */
/** @typedef {{ id: string, title: string, items: CheckItem[] }} CheckSection */
/** @typedef {{ id: string, title: string, sections: CheckSection[] }} CheckModule */

/** @type {CheckModule[]} */
export const QA_MODULES = [
  {
    id: "auth",
    title: "Auth & Onboarding",
    sections: [
      {
        id: "login",
        title: "Login & Signup",
        items: [
          { id: "AUTH-01", priority: "P0", item: "Email/password login succeeds", steps: "Go to /login, enter valid credentials", expected: "Redirect to /library, session active" },
          { id: "AUTH-02", priority: "P1", item: "OAuth login (if configured)", steps: "Use Google/OAuth button", expected: "Account created or linked, library loads" },
          { id: "AUTH-03", priority: "P0", item: "Invalid password shows error", steps: "Wrong password", expected: "Clear error, no crash" },
          { id: "AUTH-04", priority: "P1", item: "Signup with strong password", steps: "/login?signup=1, complete wizard", expected: "Confirmation email flow or immediate access per config" },
          { id: "AUTH-05", priority: "P1", item: "Password recovery", steps: "Forgot password → email link", expected: "Reset works, can login" },
          { id: "AUTH-06", priority: "P0", item: "Sign out clears session", steps: "User menu → Sign out", expected: "Redirect login, library scope reset" },
          { id: "AUTH-07", priority: "P1", item: "Trial banner visible on trial account", expected: "TrialBanner in library header" },
          { id: "AUTH-08", priority: "P0", item: "Trial expired gate blocks app", expected: "Overlay until subscribe or license key" },
        ],
      },
      {
        id: "onboarding",
        title: "Onboarding",
        items: [
          { id: "ONB-01", priority: "P1", item: "Welcome modal on first visit (?welcome=1)", expected: "Create play / Import .fdb / Tour / Skip" },
          { id: "ONB-02", priority: "P2", item: "Create play from onboarding opens create flow", expected: "Create modal or designer opens" },
          { id: "ONB-03", priority: "P2", item: "Import .fdb from onboarding triggers import", expected: "Import picker opens on Draw tab" },
          { id: "ONB-04", priority: "P2", item: "Skip dismisses modal permanently", expected: "Does not reappear on refresh" },
        ],
      },
    ],
  },
  {
    id: "library-draw",
    title: "Library — Draw",
    sections: [
      {
        id: "create-import",
        title: "Create & Import",
        items: [
          { id: "DRW-01", priority: "P0", item: "Create new play", steps: "Create → fill metadata → save", expected: "Play in list, opens in designer" },
          { id: "DRW-02", priority: "P0", item: "Create new drill", expected: "Type drill, ball tool available in designer" },
          { id: "DRW-03", priority: "P1", item: "Import .fdb file", steps: "Import .fdb → select FastDraw export", expected: "Plays imported with thumbnails" },
          { id: "DRW-04", priority: "P2", item: "Deep link ?new=1 opens create", expected: "Create modal auto-opens" },
          { id: "DRW-05", priority: "P2", item: "Deep link ?import=1 opens import", expected: "Import picker auto-opens" },
        ],
      },
      {
        id: "browse",
        title: "Browse & Filter",
        items: [
          { id: "DRW-10", priority: "P0", item: "Type chips filter (All/Favorites/Plays/Drills)", expected: "List count changes correctly" },
          { id: "DRW-11", priority: "P1", item: "Search by play name", expected: "Matching plays only" },
          { id: "DRW-12", priority: "P1", item: "Season/team/series/tags filters", expected: "Combined filters work" },
          { id: "DRW-13", priority: "P1", item: "Sort control changes order", expected: "Order updates, persists preference" },
          { id: "DRW-14", priority: "P1", item: "Pagination (50/page)", expected: "Next/prev pages work" },
          { id: "DRW-15", priority: "P1", item: "Preview panel shows frames + animation", expected: "Select row → preview updates" },
          { id: "DRW-16", priority: "P2", item: "Split resizer between list and preview", expected: "Drag divider, layout persists" },
          { id: "DRW-17", priority: "P1", item: "Favorite toggle", expected: "Star persists, Favorites filter works" },
        ],
      },
      {
        id: "actions",
        title: "Row Actions & Bulk",
        items: [
          { id: "DRW-20", priority: "P0", item: "Open in designer", expected: "/designer?item=id loads play" },
          { id: "DRW-21", priority: "P1", item: "Duplicate play", expected: "Copy appears with distinct id" },
          { id: "DRW-22", priority: "P1", item: "Edit details modal", expected: "Metadata saves" },
          { id: "DRW-23", priority: "P1", item: "Delete with confirm", expected: "Play removed" },
          { id: "DRW-24", priority: "P2", item: "Context menu all actions", expected: "Right-click menu complete" },
          { id: "DRW-25", priority: "P2", item: "Bulk selection operations", expected: "Multi-select works" },
        ],
      },
      {
        id: "preview-export",
        title: "Preview — Present / Print / Share",
        items: [
          { id: "DRW-30", priority: "P1", item: "Present overlay animation", steps: "Present → Space/ arrows", expected: "Play/pause, frame step, Esc close" },
          { id: "DRW-31", priority: "P1", item: "Print single play PDF", expected: "Print overlay → Save as PDF" },
          { id: "DRW-32", priority: "P1", item: "Share link generation", expected: "URL with #s= hash, opens in incognito" },
          { id: "DRW-33", priority: "P2", item: "Add to playbook from preview", expected: "Play added to selected playbook" },
          { id: "DRW-34", priority: "P2", item: "Add to practice from preview", expected: "Practice block created" },
        ],
      },
      {
        id: "clean",
        title: "Library Clean",
        items: [
          { id: "DRW-40", priority: "P2", item: "Library Clean panel opens", expected: "Review queue visible" },
          { id: "DRW-41", priority: "P2", item: "Duplicate detection", expected: "Duplicate groups listed" },
          { id: "DRW-42", priority: "P2", item: "Duplicate merge", expected: "Merged play correct, duplicate removed" },
        ],
      },
    ],
  },
  {
    id: "playbooks",
    title: "Library — Playbooks",
    sections: [
      {
        id: "pb-core",
        title: "Playbooks Core",
        items: [
          { id: "PB-01", priority: "P0", item: "Create playbook", expected: "Appears in sidebar list" },
          { id: "PB-02", priority: "P0", item: "Add/remove plays", expected: "Preview updates" },
          { id: "PB-03", priority: "P1", item: "Rename playbook", expected: "Name persists" },
          { id: "PB-04", priority: "P1", item: "Delete playbook", expected: "Playbook gone, plays remain" },
          { id: "PB-05", priority: "P1", item: "Inline preview zoom/pages", expected: "Navigate multi-page layout" },
        ],
      },
      {
        id: "pb-export",
        title: "Print & Share",
        items: [
          { id: "PB-10", priority: "P0", item: "Download/Print PDF", steps: "Print settings → Print/Save PDF", expected: "PDF with branding, all plays" },
          { id: "PB-11", priority: "P1", item: "Print settings panel options", expected: "Cover, layout, scale apply" },
          { id: "PB-12", priority: "P1", item: "Share to players", expected: "Roster picker → link works incognito" },
          { id: "PB-13", priority: "P2", item: "Save to cloud (cloud user)", expected: "Sync completes without error" },
        ],
      },
    ],
  },
  {
    id: "gameplan",
    title: "Library — Game Plan",
    sections: [
      {
        id: "gp-core",
        title: "Plan Management",
        items: [
          { id: "GP-01", priority: "P0", item: "Create game plan (opponent)", expected: "Plan in list, draft status" },
          { id: "GP-02", priority: "P0", item: "Add plays to categories", expected: "Entries appear per category" },
          { id: "GP-03", priority: "P1", item: "Edit call names and entry notes", expected: "Saves on apply" },
          { id: "GP-04", priority: "P1", item: "Suggest plays modal", expected: "Library matches suggested" },
          { id: "GP-05", priority: "P1", item: "Duplicate / rematch / archive", expected: "Each action correct" },
          { id: "GP-06", priority: "P2", item: "Deep link ?plan=id", expected: "Plan auto-selected" },
          { id: "GP-07", priority: "P1", item: "Scouting keys + post-game notes", expected: "Text persists" },
        ],
      },
      {
        id: "gp-opponent",
        title: "Opponent Board & Film Evidence",
        items: [
          { id: "GP-10", priority: "P0", item: "Add opponent tendency preset", expected: "Chip on board" },
          { id: "GP-11", priority: "P1", item: "Suggested defense plays → Add", expected: "Play in Defense category" },
          { id: "GP-12", priority: "P0", item: "Film evidence panel links", steps: "After AI scout apply", expected: "Watch clip ↗ opens Film Room at timestamp" },
          { id: "GP-13", priority: "P0", item: "Film evidence Designer read frame link", steps: "Scout with disruption offense match", expected: "Reject frame ↗ opens Designer at read frame" },
          { id: "GP-14", priority: "P1", item: "Opponent history import", expected: "Prior scout merged" },
          { id: "GP-15", priority: "P1", item: "Clip button on film-linked tendency", expected: "Correct session + time" },
        ],
      },
      {
        id: "gp-gameday",
        title: "Game Day & Timeout",
        items: [
          { id: "GP-20", priority: "P0", item: "Game Day full-screen board", expected: "Categories navigable" },
          { id: "GP-21", priority: "P0", item: "Staff live view link sync", steps: "2 browsers, change category", expected: "Remote view updates" },
          { id: "GP-22", priority: "P1", item: "Timeout mode slides", expected: "Counter cues from AI scout" },
          { id: "GP-23", priority: "P0", item: "Timeout offense read slides", steps: "Game plan with film refs + playId", expected: "Read frame diagram, Designer + film links" },
          { id: "GP-24", priority: "P0", item: "Game Day offense read strip", expected: "Read cards with thumbnail on board header" },
          { id: "GP-25", priority: "P1", item: "Bench card PDF print", expected: "One-page call sheet" },
        ],
      },
      {
        id: "gp-homework",
        title: "Homework & Practice Prep",
        items: [
          { id: "GP-30", priority: "P1", item: "Create player homework", expected: "Assignment with due date" },
          { id: "GP-31", priority: "P1", item: "Share homework per player", expected: "Personalized link" },
          { id: "GP-32", priority: "P1", item: "Player ack opened/studied", steps: "Incognito homework link", expected: "Coach panel counts update" },
          { id: "GP-33", priority: "P0", item: "Assign disruption reads to homework", steps: "Film Room → Analyze → Player homework", expected: "Read items with liveCall + read frame in share link" },
          { id: "GP-34", priority: "P1", item: "Player homework film read study", steps: "Incognito homework link", expected: "CALL banner, Study read opens at frame" },
          { id: "GP-35", priority: "P2", item: "Prep practice before game", expected: "Practice session created with date" },
        ],
      },
    ],
  },
  {
    id: "fields",
    title: "Library — Fields",
    sections: [
      {
        id: "fld",
        title: "Seasons / Teams / Series / Tags",
        items: [
          { id: "FLD-01", priority: "P1", item: "Create team", expected: "Available in play filters & Players" },
          { id: "FLD-02", priority: "P1", item: "Rename field value", expected: "Plays reflect new name" },
          { id: "FLD-03", priority: "P2", item: "Delete unused field", expected: "Removed from lists" },
          { id: "FLD-04", priority: "P2", item: "Play count per field accurate", expected: "Count matches library" },
        ],
      },
    ],
  },
  {
    id: "practice",
    title: "Library — Practice",
    sections: [
      {
        id: "prac-build",
        title: "Session Builder",
        items: [
          { id: "PRC-01", priority: "P0", item: "Create practice session", expected: "Session in list" },
          { id: "PRC-02", priority: "P0", item: "Add play blocks + cue blocks", expected: "Duration totals correct" },
          { id: "PRC-03", priority: "P1", item: "Drag reorder blocks", expected: "Order persists" },
          { id: "PRC-04", priority: "P1", item: "Add whole playbook", expected: "Plays expanded into blocks" },
          { id: "PRC-05", priority: "P2", item: "Save/load template", expected: "Template reusable" },
          { id: "PRC-06", priority: "P2", item: "Missing play warning", expected: "Flagged in UI" },
        ],
      },
      {
        id: "prac-live",
        title: "Live Mode",
        items: [
          { id: "PRC-10", priority: "P0", item: "Live timer start/pause (Space)", expected: "Timer counts down" },
          { id: "PRC-11", priority: "P1", item: "Next/prev block (arrows)", expected: "Block highlight moves" },
          { id: "PRC-12", priority: "P1", item: "Mark done & advance (Enter)", expected: "Advances to next block" },
          { id: "PRC-13", priority: "P1", item: "Exit live (Esc)", expected: "Returns to planner" },
          { id: "PRC-14", priority: "P0", item: "Disruption CALL banner", steps: "Add reads from Film Room", expected: "Large red CALL + read frame thumbnail" },
          { id: "PRC-15", priority: "P1", item: "Share view live call sync", steps: "Practice share + live mode", expected: "Live call updates on share page" },
        ],
      },
      {
        id: "prac-export",
        title: "Print & Share",
        items: [
          { id: "PRC-20", priority: "P1", item: "Session PDF print", expected: "Blocks + durations in PDF" },
          { id: "PRC-21", priority: "P1", item: "Share practice link", expected: "Read-only in incognito" },
        ],
      },
    ],
  },
  {
    id: "players",
    title: "Library — Players",
    sections: [
      {
        id: "roster",
        title: "Roster",
        items: [
          { id: "PLR-01", priority: "P1", item: "Add player with team", expected: "Appears in roster" },
          { id: "PLR-02", priority: "P1", item: "Edit/delete player", expected: "CRUD works" },
          { id: "PLR-03", priority: "P2", item: "Filter by team + search", expected: "List filters" },
          { id: "PLR-04", priority: "P2", item: "Player in share-to-players picker", expected: "Selectable in homework/share flows" },
        ],
      },
    ],
  },
  {
    id: "designer",
    title: "Designer",
    sections: [
      {
        id: "des-tools",
        title: "Tools & Objects",
        items: [
          { id: "DSG-01", priority: "P0", item: "Place offense/defense players", steps: "O/P and X shortcuts", expected: "Markers snap, labels editable" },
          { id: "DSG-02", priority: "P0", item: "Draw pass, cut, dribble, screen, shot", steps: "L then C/P/B/R/S", expected: "Actions on court, sequence panel" },
          { id: "DSG-03", priority: "P1", item: "Ball on drill (B)", expected: "Ball ring on player" },
          { id: "DSG-04", priority: "P1", item: "Text, cone, flag, shadow, zone tools", expected: "Objects place and edit" },
          { id: "DSG-05", priority: "P1", item: "Delete selected (Delete key)", expected: "Object/action removed" },
          { id: "DSG-06", priority: "P0", item: "Undo/redo (Ctrl+Z / Ctrl+Shift+Z)", expected: "5+ steps reversible" },
        ],
      },
      {
        id: "des-frames",
        title: "Frames & Animation",
        items: [
          { id: "DSG-10", priority: "P0", item: "Add/duplicate/delete frames", expected: "Frame strip updates" },
          { id: "DSG-11", priority: "P0", item: "Animation playback", expected: "Smooth, ball transfers" },
          { id: "DSG-12", priority: "P1", item: "Player propagation across frames", expected: "Positions propagate per rules" },
          { id: "DSG-13", priority: "P1", item: "Frame notes rich text", expected: "Notes save and print" },
          { id: "DSG-14", priority: "P2", item: "Import frame from library play", expected: "Frame content copied" },
          { id: "DSG-15", priority: "P2", item: "Mirror frame (Ctrl+Shift+M)", expected: "Horizontal mirror" },
          { id: "DSG-16", priority: "P2", item: "Formations / FastBuild", expected: "Preset layout applied" },
          { id: "DSG-17", priority: "P0", item: "Read branch frame (coverage read)", steps: "Add read frame on frame", expected: "Read branch linked to parent frame" },
          { id: "DSG-18", priority: "P0", item: "Deep link ?item=&frame=N", expected: "Designer opens at read frame" },
        ],
      },
      {
        id: "des-court",
        title: "Court Settings",
        items: [
          { id: "DSG-20", priority: "P1", item: "Half vs full court", expected: "Layout changes" },
          { id: "DSG-21", priority: "P1", item: "Court template (NCAA/NBA/FIBA/HS)", expected: "Lines match template" },
          { id: "DSG-22", priority: "P2", item: "Wood texture + line toggles", expected: "Visual updates" },
        ],
      },
      {
        id: "des-export",
        title: "Save & Export",
        items: [
          { id: "DSG-30", priority: "P0", item: "Save persists to library", steps: "Edit → navigate away → return", expected: "Changes kept" },
          { id: "DSG-31", priority: "P1", item: "Unsaved changes guard", expected: "Prompt on leave" },
          { id: "DSG-32", priority: "P1", item: "Share link from designer", expected: "Valid #s= URL" },
          { id: "DSG-33", priority: "P2", item: "Export MP4 animation", expected: "Video downloads (Chrome/Edge)" },
          { id: "DSG-34", priority: "P2", item: "Export PNG frames", expected: "Images download" },
          { id: "DSG-35", priority: "P2", item: "Print from designer", expected: "Print overlay works" },
        ],
      },
    ],
  },
  {
    id: "film-room",
    title: "Film Room",
    sections: [
      {
        id: "film-session",
        title: "Sessions & Video",
        items: [
          { id: "FIL-01", priority: "P0", item: "Upload MP4 session", expected: "Session in sidebar, video plays" },
          { id: "FIL-02", priority: "P1", item: "YouTube URL session", expected: "Embeds and scrubs" },
          { id: "FIL-03", priority: "P1", item: "Direct MP4 URL session", expected: "Video loads" },
          { id: "FIL-04", priority: "P1", item: "Delete session", expected: "Removed with confirm" },
          { id: "FIL-05", priority: "P1", item: "Deep link ?session=&t=", expected: "Opens session, seeks to time" },
        ],
      },
      {
        id: "film-annotate",
        title: "Annotation & Navigation",
        items: [
          { id: "FIL-10", priority: "P1", item: "Pen/laser strokes time-synced", expected: "Strokes appear at playhead, rewind shows again" },
          { id: "FIL-11", priority: "P1", item: "Shuttle wheel seek", expected: "Fine scrub works" },
          { id: "FIL-12", priority: "P1", item: "Fullscreen F + Space play/pause", expected: "Works in fullscreen" },
          { id: "FIL-13", priority: "P2", item: "Auto-clear on scrub toggle", expected: "Drawings clear when scrubbing if enabled" },
        ],
      },
      {
        id: "film-tags",
        title: "Coach Tags & Chapters",
        items: [
          { id: "FIL-20", priority: "P0", item: "Tag events 1–7 at playhead", expected: "Orange markers on timeline" },
          { id: "FIL-21", priority: "P1", item: "Undo last tag / edit tag", expected: "Tag updated or removed" },
          { id: "FIL-22", priority: "P0", item: "Add chapter bookmark (B key)", expected: "Green marker, list entry" },
          { id: "FIL-23", priority: "P1", item: "Quick chapter labels (ATO, Horns…)", expected: "Chapter at current time" },
          { id: "FIL-24", priority: "P1", item: "Chapter list seek + edit + delete", expected: "Jump to timestamp" },
          { id: "FIL-25", priority: "P0", item: "Disruption tags H/W/I/T/D/K/P/C/O", expected: "Red markers, disruption panel" },
          { id: "FIL-26", priority: "P0", item: "Plan broke here bookmark (Shift+B)", expected: "Disruption bookmark on timeline" },
        ],
      },
      {
        id: "film-disruption",
        title: "Disruption & Possession Playlist",
        items: [
          { id: "FIL-50", priority: "P0", item: "AI disruption read panel", steps: "Analyze clip with ICE/switch tags", expected: "Headline, reads, library variations, ideal gap" },
          { id: "FIL-51", priority: "P0", item: "Possession playlist Start / Next", expected: "Seeks to bookmark, plays video" },
          { id: "FIL-52", priority: "P1", item: "Playlist filter Disruptions only", expected: "Only disruption bookmarks listed" },
          { id: "FIL-53", priority: "P1", item: "Playlist keyboard [ ] N", expected: "Prev/next possession without mouse" },
          { id: "FIL-54", priority: "P1", item: "Add reads to practice", expected: "Practice blocks with liveCall + notes" },
          { id: "FIL-55", priority: "P1", item: "Add reads to player homework", expected: "Homework readItems on game plan" },
          { id: "FIL-56", priority: "P1", item: "Auto bookmark after AI disruption", expected: "Plan broke here bookmark created" },
        ],
      },
      {
        id: "film-ai",
        title: "AI Analyze & Game Plan",
        items: [
          { id: "FIL-30", priority: "P0", item: "Analyze clip (OPENAI configured)", steps: "Upload MP4 → tag → Analyze", expected: "Modal with summary, tendencies, coaching" },
          { id: "FIL-31", priority: "P0", item: "Frame preview strip (10 frames)", expected: "Thumbnails before/during analyze" },
          { id: "FIL-32", priority: "P0", item: "Apply full scout to game plan", expected: "Tendencies, plays, notes, timeout cues, film refs" },
          { id: "FIL-33", priority: "P1", item: "Add to game plan (manual tendency)", expected: "Tendency with film link" },
          { id: "FIL-34", priority: "P1", item: "Analysis history reopen", expected: "Past read opens modal" },
          { id: "FIL-35", priority: "P1", item: "AI off when no OPENAI_API_KEY", expected: "Hint shown, Analyze disabled" },
        ],
      },
      {
        id: "film-pdf",
        title: "Scout PDF",
        items: [
          { id: "FIL-40", priority: "P1", item: "Scout PDF from analyze modal", expected: "Print/Save PDF with branding" },
          { id: "FIL-41", priority: "P1", item: "Session PDF with chapters + analyses", expected: "Chapters section + clip links" },
        ],
      },
    ],
  },
  {
    id: "share",
    title: "Share Links",
    sections: [
      {
        id: "share-types",
        title: "Share Types (incognito)",
        items: [
          { id: "SHR-01", priority: "P0", item: "Play share link", expected: "Animation viewable, no login" },
          { id: "SHR-02", priority: "P1", item: "Playbook share link", expected: "Read-only playbook" },
          { id: "SHR-03", priority: "P1", item: "Practice share link", expected: "Session plan visible" },
          { id: "SHR-04", priority: "P1", item: "Game plan share link", expected: "Categories readable" },
          { id: "SHR-05", priority: "P1", item: "Homework share + ack", expected: "Opened/studied tracked" },
          { id: "SHR-06", priority: "P1", item: "Game day staff link", expected: "Live category sync" },
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings & Admin",
    sections: [
      {
        id: "set-coach",
        title: "Coach Settings",
        items: [
          { id: "SET-01", priority: "P1", item: "Profile name/email update", expected: "Saves" },
          { id: "SET-02", priority: "P1", item: "PDF branding (logo, footer)", expected: "Appears on print exports" },
          { id: "SET-03", priority: "P1", item: "Library JSON export/import", expected: "Backup restores plays" },
          { id: "SET-04", priority: "P0", item: "Cloud sync library (cloud user)", expected: "Merge stats, no data loss" },
          { id: "SET-05", priority: "P1", item: "Devices list vs limit", expected: "Accurate device count" },
        ],
      },
      {
        id: "set-admin",
        title: "Admin",
        items: [
          { id: "SET-10", priority: "P2", item: "Library nav module toggle", steps: "Disable Film Room", expected: "Tab hidden, /film-room redirects" },
          { id: "SET-11", priority: "P2", item: "User role management", expected: "Role change applies" },
          { id: "SET-12", priority: "P2", item: "Org seats and invites", expected: "Coach can join org" },
        ],
      },
    ],
  },
  {
    id: "cloud-pwa",
    title: "Cloud Sync & PWA",
    sections: [
      {
        id: "sync",
        title: "Cloud Sync",
        items: [
          { id: "CLD-01", priority: "P0", item: "Two-device sync", steps: "Create play on A → sync B", expected: "Play on B" },
          { id: "CLD-02", priority: "P1", item: "Delete syncs as tombstone", expected: "Removed on other device" },
          { id: "CLD-03", priority: "P1", item: "Settings sync", expected: "PDF brand matches" },
        ],
      },
      {
        id: "pwa",
        title: "PWA & Offline",
        items: [
          { id: "PWA-01", priority: "P2", item: "Install prompt / Add to Home Screen", expected: "Standalone app opens" },
          { id: "PWA-02", priority: "P2", item: "Offline shell after prior visit", expected: "offline.html or cached shell" },
          { id: "PWA-03", priority: "P2", item: "Update prompt after deploy", expected: "New version notification" },
        ],
      },
    ],
  },
  {
    id: "smoke",
    title: "Production Smoke (fastcourt.eu)",
    sections: [
      {
        id: "prod",
        title: "15-minute smoke",
        items: [
          { id: "SMK-01", priority: "P0", item: "Login on production", expected: "Library loads" },
          { id: "SMK-02", priority: "P0", item: "Create play → designer → save", expected: "End-to-end OK" },
          { id: "SMK-03", priority: "P0", item: "Film Room analyze on production", expected: "AI returns (if key set)" },
          { id: "SMK-04", priority: "P1", item: "Share link on production domain", expected: "Hash decode works" },
          { id: "SMK-05", priority: "P1", item: "Game Plan Game Day on production", expected: "Board opens" },
        ],
      },
    ],
  },
];
