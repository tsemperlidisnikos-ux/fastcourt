# Domain fastcourt.eu → Vercel

Production app: **fastcourt-next** on Vercel.

Domains already added to the project:
- `fastcourt.eu`
- `www.fastcourt.eu`

## Current DNS (before change)

| Host | Points to | Meaning |
|------|-----------|---------|
| `fastcourt.eu` | `185.138.42.0` | Papaki / old hosting |
| `www.fastcourt.eu` | same (alias) | Papaki |

## What you must do — Papaki DNS

1. Login at [Papaki](https://www.papaki.com) → **Domains** → **fastcourt.eu** → **DNS / Name servers**.

2. **Keep existing MX records** (email) — do not delete them.

3. Update **A records**:

| Type | Host / Name | Value | TTL |
|------|-------------|-------|-----|
| **A** | `@` (or empty / root) | `76.76.21.21` | 3600 |
| **A** | `www` | `76.76.21.21` | 3600 |

Alternative for `www` only: **CNAME** `www` → `cname.vercel-dns.com` (Vercel accepts both).

4. Remove or replace the old A record pointing to `185.138.42.0`.

5. Wait **5–30 minutes** (sometimes up to 48h) for DNS propagation.

6. Vercel will issue **HTTPS (Let's Encrypt)** automatically when DNS is correct. You get an email when verification completes.

## Verify

```powershell
nslookup fastcourt.eu
# Should show 76.76.21.21

cd c:\fastcourt-next
vercel domains inspect fastcourt.eu
```

Open:
- https://fastcourt.eu
- https://www.fastcourt.eu

Both should show the FastCourt app (same as fastcourt-next.vercel.app).

## Vercel dashboard

https://vercel.com/tsemperlidisnikos-3650s-projects/fastcourt-next/settings/domains

## Optional — redirect www ↔ apex

Vercel usually serves both once configured. Prefer **canonical URL** `https://fastcourt.eu` (no www) for marketing and Supabase Site URL later.

## When Supabase is ready

Add to Supabase **Authentication → URL configuration**:
- Site URL: `https://fastcourt.eu`
- Redirect: `https://fastcourt.eu/auth/callback`
- Redirect: `https://www.fastcourt.eu/auth/callback`

## Old Papaki Node.js hosting

After DNS points to Vercel, you can **disable** the old Plesk Node.js app on Papaki (optional, saves resources). Keep the domain registered at Papaki — only DNS changes.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Still shows old site | DNS cache — wait or flush; check Papaki saved the new A record |
| SSL pending | Wait for DNS + Vercel cert (up to ~1h) |
| Email stopped | Restore MX records in Papaki DNS |
| 404 on Vercel | Domain must be on project `fastcourt-next` (already done) |
