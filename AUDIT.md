# FastCourt Next — Baseline Audit (Βήμα 0)

**Ημερομηνία:** 2026-06-12  
**Legacy reference:** `C:\fastcourt` (PWA `fastcourt-v591`)  
**Next build tag:** `next-v7`

## Build & Lint

| Check | Αποτέλεσμα | Λεπτομέρειες |
|-------|------------|--------------|
| `npm run build` | **FAIL** → fixed | TypeScript error: `getAllRosterPlayers` missing από `player-roster.ts` (διορθώθηκε στο audit) |
| `npm run lint` | **FAIL** | ~41 errors, κυρίως `react-hooks/set-state-in-effect` (LoginForm, DesignerScreen, modals) + unused vars |

### Κρίσιμα lint hotspots

- `LoginForm.tsx` — setState σε useEffect (team invite hydration)
- `DesignerScreen.tsx` — setState σε useEffect (initial panel)
- `FormationModal.tsx`, `LineTypeModal.tsx` — mounted pattern
- Warnings: unused vars σε CourtCanvas, CourtFrameThumbnail

**Σύσταση:** ξεχωριστό PR για lint cleanup (refactor effects → lazy init / useSyncExternalStore).

---

## Assets

| Asset | Legacy | Next `public/` | Status |
|-------|--------|----------------|--------|
| `icons/fastcourt-logo.png` | Αναφέρεται σε HTML/JS | **Λείπει** | PNG δεν υπάρχει ούτε στο legacy repo (μόνο `icons/icon.svg`) |
| `icons/apple-touch-icon-*.png` | Ναι (PWA) | **Λείπει** | Phase 5 |
| `icon.svg` | Ναι | Ναι | OK |
| `manifest.webmanifest` | Runtime blob + static | Ναι | Partial (χωρίς SW) |

**Ενέργεια:** Προσθήκη `public/icons/icon.svg` (αντιγραφή από legacy). Για PNG logo — δημιουργία/export από brand asset ή `tools/make-logo-transparent.py`.

---

## Migration Status (ενημερωμένο)

| Οθόνη | Parity | Σημειώσεις |
|-------|--------|------------|
| **Library — Draw** | ✅ Done | FastDraw table, filters, preview, bulk, import, clean, print |
| **Library — Playbooks** | ✅ Done | Present, print, share, manage |
| **Library — Fields** | ✅ Done | Seasons, teams, series, tags |
| **Library — Practice** | ⚠️ Partial | UI υπάρχει· legacy πλουσιότερο (templates, drag, gym mode) |
| **Login / Welcome** | ✅ Done | Welcome CSS, OAuth, signup wizard· gaps: onboarding modal, PWA bars |
| **Designer — core tools** | ✅ Done | Konva, players, lines, shots, zones, shadows, formations, whiteboard |
| **Designer — overflow menu** | ❌ Missing | Share, print, PNG/WebM export, import phase, snippets, mirror |
| **Settings — Coach** | ⚠️ Partial | Subscription, PDF, tools· gaps: team workspace, full backup |
| **Settings — Admin** | ⚠️ Partial | Users, orgs, billing, appearance· gaps: device limits, cloud sync UI |
| **Players tab** | ⚠️ Planned | `PlayersView.tsx` έτοιμο — wiring στο plan (βλ. Players tab quick win) |
| **PlayBank** | ❌ Missing | Legacy overlay + catalog |
| **Free-draw** | ❌ Missing | Standalone quick-draw· whiteboard-on-frame μόνο |
| **Cloud sync** | ❌ Missing | Auth OK· library IndexedDB only |
| **PWA / offline** | ⚠️ Partial | Manifest μόνο· χωρίς service worker |
| **Device limits** | ⚠️ Partial | Config + copy· χωρίς login enforcement |
| **Share links** | ✅ Done | LZ hash URLs· remote `r:` links partial |

---

## Gap Checklist — Λεπτομερές

### Login / Welcome

- [x] Welcome card layout + legal links (Privacy/Terms → alert "coming soon")
- [x] Email/password two-step login
- [x] OAuth Google/Apple/Facebook
- [x] Signup wizard (role, team, trial)
- [ ] Post-signup onboarding modal (quickstart / import FDB)
- [ ] PWA install/update/offline bars
- [ ] Admin preview badge on welcome
- [ ] Payment step parity (legacy plan picker vs trial-only copy)
- [ ] Trial days: legacy 7 vs Next 14

### Library

- [x] Tabs: Draw, Playbooks, Fields, Practice
- [ ] Tab: Players (component exists, not routed)
- [x] Filter bar + type chips + split preview
- [x] Create play, import .fdb, bulk ops, clean panel
- [ ] Library sort menu
- [ ] Contextual Create (New Drill / New Playbook on Draw)
- [ ] New Practice from Draw filter bar
- [ ] PlayBank entry
- [ ] Snippets / building blocks overlay
- [ ] Team workspace banner
- [ ] FastDraw post-import QA panel (full legacy)

### Designer

- [x] Left tool panel (O/D, lines, shots, text, cone, shadow, zone)
- [x] Frame nav, formations, FastBuild, undo/redo
- [x] Whiteboard ink on frames
- [x] Animation sidebar (partial vs legacy export)
- [ ] Court zoom UI (+/−/reset)
- [ ] Court sheet (OOB / BLOB / SLOB)
- [ ] Overflow: share, print, PNG/WebM/MP4 export
- [ ] Import play / import phase
- [ ] Mirror frame/play, blank frame, snippets
- [ ] Present from designer

### Settings

- [x] Coach: subscription, license, PDF branding, tools (JSON subset)
- [x] Admin: users CRUD, orgs, billing config, appearance, library viewer
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

## Προτεραιότητες μετά το audit

1. **Phase 4 cloud sync** — κρίσιμο για club deployments
2. **Build/lint green** — lint errors σε ξεχωριστό pass
3. **Wire Players tab** + share overlays
4. **Designer overflow menu** (export/share/print)
5. **PlayBank** port
6. **PWA** (Phase 5)

---

## Επόμενα βήματα

→ **Βήμα 1:** Cloud sync module (`src/lib/cloud/`)
