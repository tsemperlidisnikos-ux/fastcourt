# FastCourt — Deploy checklist

Κάθε φορά που αλλάζεις κώδικα και θες να πάει live στο **https://fastcourt.eu**.

## 1. Τοπικά (προαιρετικό αλλά συνιστάται)

```powershell
cd c:\fastcourt-next
npm run dev
```

- Άνοιξε http://localhost:3000
- Έλεγξε ό,τι άλλαξες (landing, login, designer, settings)

Γρήγορο build test:

```powershell
npm run build
```

## 2. Deploy στο Vercel

```powershell
cd c:\fastcourt-next
vercel deploy --prod --yes
```

- Περίμενε ~1 λεπτό
- Το site ενημερώνεται στο **https://fastcourt.eu**

## 3. Μετά το deploy — έλεγχος live

- [ ] https://fastcourt.eu — landing φορτώνει
- [ ] https://fastcourt.eu/login — login / signup
- [ ] https://fastcourt.eu/library — (μετά login) library
- [ ] Hard refresh αν δεν βλέπεις αλλαγές: **Ctrl+F5**

## 4. Αν άλλαξες auth / database

**Supabase → Authentication → URL configuration**

Redirect URLs πρέπει να περιλαμβάνουν:

- `https://fastcourt.eu/auth/callback`
- `http://localhost:3000/auth/callback`

**Vercel → Settings → Environment Variables** (Production)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Μετά από αλλαγή env vars: **ξανά deploy** (`vercel deploy --prod --yes`).

## 5. Αν άλλαξες database schema

```powershell
npm run supabase:schema
```

Paste `supabase/schema-combined.sql` στο **Supabase → SQL Editor** (μόνο για νέα migrations).

## 6. Συχνά προβλήματα

| Πρόβλημα | Λύση |
|----------|------|
| Δεν βλέπω αλλαγές | Ctrl+F5 ή incognito |
| «Cloud sign-in is not configured» | Έλεγξε Supabase env vars στο Vercel + redeploy |
| Signup/login αποτυγχάνει | Redirect URL στο Supabase |
| Build fail τοπικά | `npm run build` — διόρθωσε errors πριν deploy |

## Σύντομη εντολή (μόνο deploy)

```powershell
cd c:\fastcourt-next; vercel deploy --prod --yes
```
