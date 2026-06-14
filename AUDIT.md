# FastCourt Next — Baseline Audit

**Ημερομηνία:** 2026-06-14 (ενημερωμένο)  
**Legacy reference:** `C:\fastcourt` (PWA `fastcourt-v591`)  
**Next build tag:** `next-v7`

## Build & Lint

| Check | Αποτέλεσμα | Λεπτομέρειες |
|-------|------------|--------------|
| `npm run build` | **PASS** | TypeScript + Turbopack production build |
| `npm run lint` | **PASS** | 0 errors, 0 warnings |
| `npm test` | **PASS** | 63 unit tests (health-check) |

---

## Assets

| Asset | Legacy | Next `public/` | Status |
|-------|--------|----------------|--------|
| `icons/fastcourt-logo.png` | Αναφέρεται σε HTML/JS | **Λείπει** | PNG δεν υπάρχει ούτε στο legacy repo (μόνο `icons/icon.svg`) |
| `icons/apple-touch-icon-*.png` | Ναι (PWA) | **Λείπει** | Phase 5 |
| `icon.svg` | Ναι | Ναι | OK |
| `manifest.webmanifest` | Runtime blob + static | Ναι | Partial (χωρίς SW) |

---

## Migration Status (ενημερωμένο 2026-06-14)

| Οθόνη | Parity | Σημειώσειες |
|-------|--------|------------|
| **Library — Draw** | ✅ Done | Table, filters, preview, bulk, import, clean, print, **New practice από selection** |
| **Library — Playbooks** | ✅ Done | Present, print, share, manage |
| **Library — Fields** | ✅ Done | Seasons, teams, series, tags |
| **Library — Practice** | ⚠️ Mostly done | Sessions, templates, drag reorder, live gym timer, share/PDF, duplicate, add playbook· gaps: template edit, live share sync |
| **Library — Players** | ✅ Done | Tab routed, roster + share |
| **Login / Welcome** | ✅ Done | OAuth, signup wizard, **post-signup onboarding** |
| **Designer — core tools** | ✅ Done | Konva, players, lines, shots, zones, formations, whiteboard |
| **Designer — overflow menu** | ⚠️ Mostly done | Share, print, PNG, mirror, import phase· **WebM/MP4 stub** |
| **Settings — Coach** | ⚠️ Partial | Subscription, PDF, tools· gaps: team workspace, full backup |
| **Settings — Admin** | ⚠️ Mostly done | Users, orgs, billing, appearance + **live header preview**, **auto tab contrast** |
| **PlayBank** | ❌ Missing | Legacy overlay + catalog |
| **Free-draw** | ❌ Missing | Standalone quick-draw· whiteboard-on-frame μόνο |
| **Cloud sync** | ❌ Missing | Auth OK· library IndexedDB only |
| **PWA / offline** | ⚠️ Partial | Manifest μόνο· χωρίς service worker |
| **Device limits** | ⚠️ Partial | Config + copy· χωρίς login enforcement |
| **Share links** | ✅ Done | LZ hash URLs· remote `r:` links partial |

---

## Gap Checklist — Λεπτομερές

### Login / Welcome

- [x] Welcome card layout + legal links (Privacy/Terms pages)
- [x] Email/password two-step login
- [x] OAuth Google/Apple/Facebook
- [x] Signup wizard (role, team, trial)
- [x] Post-signup onboarding modal (new play / import FDB / tour)
- [ ] PWA install/update/offline bars
- [ ] Admin preview badge on welcome
- [ ] Payment step parity (legacy plan picker vs trial-only copy)
- [ ] Trial days: legacy 7 vs Next 14

### Library

- [x] Tabs: Draw, Playbooks, Fields, Practice, Players
- [x] Filter bar + type chips + split preview
- [x] Create play, import .fdb, bulk ops, clean panel
- [x] Library sort control
- [x] **New Practice from Draw** (selection → session)
- [ ] Contextual Create (New Drill / New Playbook on Draw)
- [ ] PlayBank entry
- [ ] Snippets / building blocks overlay
- [ ] Team workspace banner
- [ ] FastDraw post-import QA panel (full legacy)

### Practice

- [x] Session planner (create, edit, delete, duplicate)
- [x] Add plays/drills, cue blocks (with duration prompt)
- [x] Add entire playbook to session
- [x] Templates (built-in + custom save/start)
- [x] Drag reorder + drop indicator
- [x] Live gym overlay (timer, auto-advance, wake lock, timer sound)
- [x] Share plan + session PDF (incl. gym notes)
- [x] Send to players
- [ ] Template edit/rename
- [ ] Replace missing play picker
- [ ] Live share / assistant view sync

### Designer

- [x] Left tool panel (O/D, lines, shots, text, cone, shadow, zone)
- [x] Frame nav, formations, FastBuild, undo/redo
- [x] Whiteboard ink on frames
- [x] Animation sidebar (playback)
- [x] Overflow: share, print, PNG, import phase, mirror, present
- [ ] Court zoom UI (+/−/reset) — store ready, UI missing
- [ ] Court sheet (OOB / BLOB / SLOB)
- [ ] WebM/MP4 animation export
- [ ] Snippets overlay

### Settings

- [x] Coach: subscription, license, PDF branding, tools (JSON subset)
- [x] Admin: users CRUD, orgs, billing config, appearance
- [x] Header brand row + active tab colors + live preview + auto contrast
- [ ] Cloud sync panel (sync now, iPad URL)
- [ ] Device limits enforcement
- [ ] Full backup (users + PlayBank + rosters)
- [ ] Admin password change
- [ ] FastDraw import wizard in settings

### Infrastructure

- [ ] `src/lib/cloud/` — port από `C:\fastcourt\cloud-sync.js`
- [ ] IndexedDB schema bridge (legacy blob ↔ Next normalized `plays`)
- [ ] Service worker
- [ ] Wire `RotationPlannerOverlay`, `PlayerAccessTrackerModal` στο ShareProviders

---

## IndexedDB Schema Risk

| | Legacy | Next |
|---|--------|------|
| DB name | `fastcourt_library_v1` | `fastcourt_library_v1` (ίδιο) |
| Stores | `libraries` (JSON blob per scope) | `plays` + `meta` (normalized) |

**Κίνδυνος:** Ίδιο DB name, διαφορετικό schema — χρειάζεται migration layer πριν cloud cutover.

---

## Προτεραιότητες (2026-06-14)

1. **Designer court zoom UI** — store έτοιμο, μικρό diff
2. **WebM/MP4 export** — τελευταίο μεγάλο designer gap
3. **Phase 4 cloud sync** — κρίσιμο για club deployments
4. **PlayBank** port
5. **PWA** (Phase 5)

---

## Επόμενα βήματα

→ **Court zoom UI** ή **WebM export** για designer parity  
→ **Cloud sync module** (`src/lib/cloud/`) για production clubs
