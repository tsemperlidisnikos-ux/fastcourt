# FastCourt — εκτέλεση από USB stick

## Γρήγορα (τι αντιγράφεις)

| Τρόπος | Τι βάζεις στο USB | Στο PC χρειάζεται |
|--------|-------------------|-------------------|
| **Α) Φάκελος** | Όλο το `dist-usb\` | Node.js **ή** `dist-usb\node\node.exe` |
| **Β) Ένα EXE** | `dist-electron\FastCourt-*-portable.exe` | Τίποτα (μόνο Windows) |

Μην αντιγράφεις όλο το `fastcourt-next` (ούτε `src`, ούτε `node_modules`).

---

## Δημιουργία πακέτου (στον υπολογιστή ανάπτυξης)

Από τον φάκελο `c:\fastcourt-next`:

```bat
make-usb.bat
```

Επιλογές:

```bat
make-usb.bat folder    :: μόνο dist-usb (προεπιλογή)
make-usb.bat exe       :: μόνο portable EXE
make-usb.bat all       :: και τα δύο
```

Ή με npm:

```bat
npm run build
npm run portable:usb
npm run portable:electron
```

---

## Τρόπος Α — φάκελος + browser

1. Τρέξε `make-usb.bat`
2. Αντέγραψε το **`dist-usb`** στο USB
3. Στο stick: διπλό κλικ **`FastCourt.bat`**
4. Ανοίγει `http://127.0.0.1:3911/login`
5. Κλείσε το μαύρο παράθυρο για stop

Αν δεν υπάρχει Node στο PC προορισμού, βάλε portable Node στο:

`dist-usb\node\node.exe`

(κατέβασε Node.js Windows binary / portable και βάλε το `node.exe` εκεί)

---

## Τρόπος Β — ένα EXE (προτεινόμενο για coaches)

1. Τρέξε `make-usb.bat exe` (ή `make-usb.bat all`)
2. Αντέγραψε το **`FastCourt-0.1.0-portable.exe`** από `dist-electron\` στο USB
3. Διπλό κλικ στο EXE — ανοίγει παράθυρο FastCourt με τοπικό server

---

## Cloud / offline

| Λειτουργία | USB offline | Με internet |
|------------|-------------|-------------|
| Local login + plays (IndexedDB) | Ναι | Ναι |
| Cloud login / sync | Όχι (εκτός αν το build έγινε με `.env.local` Supabase **και** υπάρχει net) | Ναι |
| Stripe / AI Film Room | Όχι χωρίς keys + net | Ναι |

Τα `NEXT_PUBLIC_*` από `.env.local` **ψηνονται στο build**. Για USB με cloud, κάνε `npm run build` όσο το `.env.local` είναι σωστό, μετά `make-usb.bat`.

---

## Αντιμετώπιση προβλημάτων

- **«Δεν βρέθηκε Node.js»** → εγκατάστησε Node LTS ή βάλε `node\node.exe`, ή χρησιμοποίησε το portable EXE.
- **Λείπει `app\server.js`** → ξανατρέξε `make-usb.bat` (πρέπει να προηγηθεί επιτυχές `npm run build`).
- **Θυροί / antivirus** μπλοκάρουν EXE από USB → Unblock / Allow.
- **Port 3911 κατειλημμένο** → κλείσε παλιό FastCourt παράθυρο ή άλλαξε `PORT` στο `FastCourt.bat`.
