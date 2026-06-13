# Deploy FastCourt on Papaki (Plesk Node.js)

Domain: **https://fastcourt.eu**

---

## Γρήγορο checklist

- [ ] Supabase URLs ρυθμισμένα
- [ ] Αρχεία ανέβηκαν στον server
- [ ] `.env` με Supabase keys
- [ ] `npm ci && npm run build` OK
- [ ] Node.js app enabled με `server.js`
- [ ] HTTPS ενεργό
- [ ] Login + `/auth/callback` δουλεύει

---

## Βήμα 1 — Supabase (πριν το deploy)

1. Άνοιξε [Supabase Dashboard](https://supabase.com/dashboard) → το project σου.
2. **Authentication → URL configuration**
   - **Site URL:** `https://fastcourt.eu`
   - **Redirect URLs** (πρόσθεσε):
     - `https://fastcourt.eu/auth/callback`
     - `https://www.fastcourt.eu/auth/callback` (αν χρησιμοποιείς www)
3. **Project Settings → API** — κράτα:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Βήμα 2 — Ετοιμασία αρχείων (τοπικά)

Από PowerShell στο project:

```powershell
cd c:\fastcourt-next
.\scripts\prepare-deploy.ps1
```

Δημιουργεί `fastcourt-deploy.zip` **χωρίς** `node_modules` και `.next`.

**Εναλλακτικά:** FTP/SFTP upload όλου του φακέλου εκτός από:
- `node_modules/`
- `.next/`
- `.env` (το φτιάχνεις μόνο στον server)

---

## Βήμα 3 — Papaki Plesk: ανέβασμα

1. Σύνδεση στο **Plesk** (Papaki control panel).
2. **Domains → fastcourt.eu → File Manager** (ή FTP).
3. Ανέβασε και κάνε extract το `fastcourt-deploy.zip` στο:
   - `httpdocs/` **ή**
   - `httpdocs/fastcourt/` (subfolder — και ρύθμισε Node.js εκεί)

Μετά το extract πρέπει να βλέπεις `package.json`, `server.js`, `src/` στο ίδιο επίπεδο.

---

## Βήμα 4 — Environment variables

**Plesk → Domains → fastcourt.eu → Node.js → Environment variables**

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) |
| `NEXT_PUBLIC_APP_BUILD` | `next-v7` |
| `NEXT_PUBLIC_ADMIN_EMAIL` | `admin@fastcourt.eu` |

Ή δημιούργησε `.env` στο application root με τα ίδια (Plesk Node.js το διαβάζει συνήθως).

> **Σημαντικό:** Μετά από αλλαγή env vars, κάνε **rebuild** (`npm run build`) — τα `NEXT_PUBLIC_*` μπαίνουν στο build.

---

## Βήμα 5 — Build στον server

**Plesk → Node.js → NPM install** (ή SSH terminal):

```bash
cd /var/www/vhosts/fastcourt.eu/httpdocs   # path μπορεί να διαφέρει
npm ci
npm run build
```

Περίμενε `✓ Compiled successfully`. Αν αποτύχει, έλεγξε Node version (≥ 20).

---

## Βήμα 6 — Ρύθμιση Node.js app

**Plesk → Domains → fastcourt.eu → Node.js**

| Setting | Value |
|---------|--------|
| Node.js version | **20.x** ή νεότερο |
| Application mode | **production** |
| Application root | φάκελος με `package.json` |
| Application startup file | **`server.js`** |
| Document root | ίδιος ή parent — αφήνεις default αν το proxy είναι ενεργό |

Κάνε **Enable Node.js** και **Restart App**.

Το Plesk ορίζει αυτόματα το `PORT` — το `server.js` το χρησιμοποιεί.

---

## Βήμα 7 — HTTPS & proxy

1. **SSL/TLS → Let's Encrypt** — ενεργοποίησε certificate για `fastcourt.eu`.
2. Στο **Node.js** panel: βεβαιώσου ότι το **Proxy mode** είναι ενεργό (Apache/nginx → Node app).
3. Αν έχεις παλιό static site στο `httpdocs/index.html`, **διέγραψέ το** ή μετακίνησέ το — αλλιώς μπορεί να παίρνει προτεραιότητα έναντι του Node app.

---

## Βήμα 8 — Smoke test

1. `https://fastcourt.eu` → φορτώνει login/library
2. Sign in (email/password ή magic link)
3. Μετά το login redirect σε `/library` (όχι error στο callback)
4. Library → Playbooks → share link → άνοιξε σε incognito
5. Settings → admin panel (αν είσαι admin)

**Συχνά προβλήματα:**

| Σύμπτωμα | Λύση |
|----------|------|
| 502 Bad Gateway | Restart Node app · έλεγξε logs στο Plesk |
| Login loop | Supabase redirect URL · rebuild με σωστά env |
| Demo mode only | Λείπουν Supabase env ή placeholder `YOUR_PROJECT` |
| 404 σε routes | Proxy mode off · rebuild missing |

---

## Βήμα 9 — Ενημερώσεις (μετά το πρώτο deploy)

```bash
# upload νέα αρχεία (zip ή git pull)
npm ci
npm run build
# Plesk Node.js → Restart App
```

---

## SSH paths (Papaki)

Typical paths (verify in Plesk File Manager):

```
/var/www/vhosts/fastcourt.eu/httpdocs/
```

Logs: **Plesk → Node.js → Application logs**

---

## English reference

Environment template (`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_APP_BUILD=next-v7
NEXT_PUBLIC_ADMIN_EMAIL=admin@fastcourt.eu
NODE_ENV=production
```

Start command alternative: `npm run start:plesk`
