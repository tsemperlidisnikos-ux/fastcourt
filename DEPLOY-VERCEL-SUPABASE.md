# Supabase login — Vercel production

## Τρέχουσα κατάσταση

- Το app **υποστηρίζει** email/password + OAuth (Google, Apple, Facebook).
- Στο Vercel **λείπουν** τα Supabase env vars (μόνο `NEXT_PUBLIC_APP_BUILD` + admin email).
- Το `.env` είχε λάθος τιμές (`sb_publishable_...` αντί για `https://xxxx.supabase.co`).

## Βήμα 1 — Supabase project

1. [Supabase Dashboard](https://supabase.com/dashboard) → project (ή δημιούργησε νέο).
2. **Settings → API**
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (π.χ. `https://abcdefgh.supabase.co`)
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT που ξεκινάει με `eyJ`)
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (μόνο server, optional για Stripe/admin scripts)

## Βήμα 2 — Database schema

```powershell
cd c:\fastcourt-next
.\scripts\build-supabase-schema.ps1
```

Άνοιξε `supabase/schema-combined.sql` στο **Supabase → SQL Editor** και τρέξε το (μία φορά).

## Βήμα 3 — Auth URLs

**Authentication → URL configuration**

| Setting | Value |
|---------|--------|
| Site URL | `https://fastcourt-next.vercel.app` |
| Redirect URLs | `https://fastcourt-next.vercel.app/auth/callback` |
| | `http://localhost:3000/auth/callback` |
| | `https://fastcourt.eu/auth/callback` (όταν ανέβει domain) |

**Authentication → Providers → Email** — ενεργό, Confirm email ανάλογα με τι θες.

Για OAuth (optional): ρύθμισε Google / Apple / Facebook στο ίδιο menu.

## Βήμα 4 — Env vars (local + Vercel)

Αυτόματα (interactive):

```powershell
npm run setup:supabase
```

Ή με παραμέτρους:

```powershell
.\scripts\setup-supabase-production.ps1 `
  -SupabaseUrl "https://YOUR_REF.supabase.co" `
  -AnonKey "eyJ..." `
  -ServiceRoleKey "eyJ..."
```

Το script:
- γράφει `.env.local`
- βάζει vars στο Vercel (production + preview + development)
- κάνει `vercel deploy --prod`

## Βήμα 5 — Δοκιμή

1. https://fastcourt-next.vercel.app/login
2. Sign up με email → confirm (αν enabled) → login
3. `/library`, `/designer` — πρέπει να ανοίγουν με session
4. Logout → redirect στο login

## Admin account (optional)

```powershell
node scripts/create-admin.mjs --email admin@fastcourt.eu --password "YourPass123!" --cloud
```

Απαιτεί `SUPABASE_SERVICE_ROLE_KEY` στο `.env.local`.

## Troubleshooting

| Σύμπτωμα | Λύση |
|----------|------|
| «Cloud sign-in is not configured» | Λάθος/missing `NEXT_PUBLIC_*` — rebuild μετά από env fix |
| `auth_callback_failed` | Redirect URL λείπει στο Supabase |
| `Invalid login credentials` | Λάθος password ή user δεν υπάρχει |
| Profile error μετά login | Τρέξε migrations (`schema-combined.sql`) |
