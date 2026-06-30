# FastCourt Next — Baseline Audit

**Updated:** 2026-06-30  
**Legacy reference:** `C:\fastcourt` (PWA `fastcourt-v591`)  
**Stack:** Next.js 16, React 19, Zustand, IndexedDB, Supabase (optional), Stripe

---

## Build & Quality Gates

| Check | Status | Notes |
|-------|--------|-------|
| `npm run build` | PASS | Production Next.js build |
| `npm run lint` | PASS | ESLint via `eslint-config-next` |
| `npm run test:unit` | PASS | 183 tests (`tsx --test scripts/tests/*.test.ts`) |
| `npm run health-check` | PASS | Unit + static + domain coverage map |
| `npm run app-check:full` | PASS | Lint + build + Playwright E2E (CI) |

**CI:** `.github/workflows/app-check.yml` runs on push/PR to `main`/`master`.

---

## Architecture Snapshot

| Layer | Location | Notes |
|-------|----------|-------|
| Routes | `src/app/` | Landing, login, library, designer, settings, Stripe webhook |
| Designer | `src/components/designer/`, `src/stores/designer/` | Konva canvas; store split into slices + helpers |
| Library | `src/components/library/`, `src/stores/library-store.ts` | IndexedDB-first plays, playbooks, practice |
| Cloud sync | `src/lib/cloud/` | Merge plays/meta/tombstones; Supabase persistence |
| Auth | `src/lib/auth/`, `src/stores/auth-store.ts` | Local + Supabase OAuth |
| Billing | Stripe webhook + `src/lib/billing/` | Subscription UI + admin config |
| Tests | `scripts/tests/` (37 files), `e2e/app-smoke.spec.ts` | Domain map in `scripts/check-config.mjs` |

---

## Migration Status

| Area | Parity | Notes |
|------|--------|-------|
| **Library — Draw** | Done | Table, filters, preview, bulk, import, print |
| **Library — Playbooks** | Done | Present, print, share, manage |
| **Library — Fields** | Done | Seasons, teams, series, tags |
| **Library — Practice** | Mostly done | Sessions, templates, live timer, share/PDF; gaps: template edit, live share sync |
| **Library — Players** | Done | Roster + share |
| **Login / Welcome** | Done | OAuth, signup wizard, onboarding |
| **Designer — core** | Done | Players, lines, shots, zones, formations, whiteboard, vector courts |
| **Designer — overflow** | Mostly done | Share, print, PNG, mirror; WebM/MP4 export gap |
| **Settings — Coach** | Mostly done | Account, PDF branding, devices, cloud sync |
| **Settings — Team Admin** | Mostly done | Org members, branding; some org data still localStorage |
| **Settings — Admin** | Mostly done | Users, orgs, billing, appearance preview |
| **Cloud sync — settings** | Done | `user_settings` (migration 002) |
| **Cloud sync — library** | Mostly done | `src/lib/cloud/` + migrations 004–007; needs production smoke test |
| **PlayBank** | Missing | Placeholder only (`src/components/playbank/.gitkeep`) |
| **PWA / offline** | Mostly done | Manifest, service worker, install banners, offline shell; full offline needs prior visit cache |
| **Share links** | Done | LZ hash URLs |

---

## Known Gaps (tracked in health-check)

1. **PlayBank** — legacy overlay + catalog not ported
2. **WebM/MP4 export** — animation export not fully wired in designer overflow
4. **Team org data in cloud** — partial; some settings remain localStorage-only
5. **CI cloud tests** — Supabase/Stripe env empty in CI (local-only mode)

---

## Supabase Migrations

| File | Purpose |
|------|---------|
| `001_billing_and_profiles.sql` | Profiles, billing fields |
| `002_user_settings.sql` | Per-user settings sync |
| `002_trial_days_default_7.sql` | Trial default |
| `003_admin_purge_policies.sql` | Admin purge RLS |
| `004_user_library.sql` | Cloud library plays |
| `005_user_library_organizer_meta.sql` | Organizer meta |
| `006_user_library_tombstones.sql` | Tombstones |
| `007_org_library_access.sql` | Org library access |

---

## IndexedDB

| | Legacy | Next |
|---|--------|------|
| DB name | `fastcourt_library_v1` | `fastcourt_library_v1` (same) |
| Schema | `libraries` blob per scope | Normalized `plays` + `meta` |

**Risk:** Same DB name, different schema — migration layer required before cloud cutover for existing users.

---

## Recent Improvements (2026-06-30)

- Removed 22 scratch `scripts/tmp-*` files; added `scripts/tmp-*` to `.gitignore`
- Split `designer-store.ts` (~1,600 lines) into `src/stores/designer/` modules
- Mapped all 37 unit tests in `check-config.mjs` (no unmapped test warnings)

---

## Recommended Next Steps

1. **Production cloud smoke test** — library sync, auth callback, Stripe webhook with real env
2. **PlayBank** — port or remove placeholder
3. **PWA** — service worker + install/update UX
4. **WebM export** — complete designer animation export
5. **Organize uncommitted work** — large in-flight diff should land as small PRs
