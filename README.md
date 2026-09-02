# OCE Flow — Paperwork Flow Command

**Office of the City Engineer · City Government of Puerto Princesa**

> Every paper, desk to desk, stamp to stamp.

```
OCE-2026-0141 · WORK ORDER · Road widening — Brgy. San Manuel Phase 2
─────────────────────────────────────────────────────────────────────
ADMIN ──transmit──▶ CONSTR ──received──▶ under review ──▶ in progress ──▶ verification
C. Estrella         R. Domingo           P. Manalo (PIC)   45% complete
```

OCE Flow tracks the physical journey of every document that crosses the Office of the
City Engineer — work orders, permits, memoranda, complaints and inspections — across
**nine divisions, four cross-division teams and two executive desks**, with a stamped
chain of custody, receipt acknowledgements, person-in-charge designation, geotagged
field evidence, real-time messaging and print-ready government reports.

---

## Contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Architecture — two modes](#architecture--two-modes)
4. [File structure](#file-structure)
5. [Quick start — front-end (standalone)](#quick-start--front-end-standalone)
6. [Quick start — back-end (Django + PostGIS on the LAN)](#quick-start--back-end-django--postgis-on-the-lan)
7. [Environment variables](#environment-variables)
8. [Accounts & roles](#accounts--roles)
9. [The print center](#the-print-center)
10. [Customization](#customization)
11. [Development notes](#development-notes)

---

## What it does

### Workflow engine
- **Tracker board** — a five-stage kanban (*Received → Under review → In progress →
  Verification → Completed*) with drag-and-drop, per-stage counts and an
  assign-person-in-charge dialog on every move.
- **Completion rate** — an adjustable progress bar on every paper (prominent for work
  orders, optional for memoranda); employees may raise it but only a division head can
  verify completion.
- **Circulation** — a paper can be addressed to several desks at once (*All Divisions /
  Offices* in one tick); each addressee stamps a **receipt** on the route sheet, and
  pending desks are flagged until they acknowledge.
- **Re-routing with confirmation** — multi-select the destination desks, review the
  journey, and confirm; single-desk forwards transfer the paper, multi-desk forwards
  circulate it.

### Custody & oversight
- **Route sheet** — the exact desk-to-desk path with officer + timestamp on every hop,
  origin desk included, re-routes flagged *off intended route*.
- **Chain of custody** — every movement, remark, attachment and receipt, attributed.
- **Personnel boards** — admin / executives / moderator see every individual's queue
  and verification tray; employees and job-order staff get a personal *My Work Board*.
- **Activity & system logs** — a floor activity audit plus a full system ledger
  (sign-ins, account changes, deletions), both printable. Admin-only user history.

### People & access
- Six roles: **admin, department head (executive), moderator, division head, employee,
  job-order** — each scoped precisely (board visibility, edit rights, routing rights).
- **OIC succession** — appoint a *temporary/OIC* head (permanent head retained for
  reinstatement) or a permanent replacement; OICs run the board but cannot manage the
  division's settings. The moderator may assign OICs; only admin/executives/moderator
  can edit titles and descriptions.
- **Sign-up with verification** — requests (with phone, email, address) wait in the
  admin's queue; the admin sets the access level. Forgot-password requests reset to
  the default `OCE@2026` after admin approval.

### Evidence & geography
- **JPG / PDF attachments** with a staged add-confirmation flow and per-file removal
  (last-geotag warning included).
- **EXIF GPS parsing** on upload — geotagged photos get coordinates, an embedded
  OpenStreetMap view, Google Maps links, and automatic **barangay resolution** via
  OSM reverse geocoding (cached per coordinate).
- Barangay board filter fed three ways: text mentions, photo geotags, and the admin's
  custom list on the Customize page.

### Live messaging
- **Executive Council** (permanent seats: executives, admin, moderator — membership
  managed by admin/moderator), an **Office Floor** for everyone, and **private
  channels per division/team**, all overseen by executives, admin and moderator.
- Multi-paper attachments per message, unread badges, and live sync across open
  sessions (server push in LAN mode).

---

## Tech stack

| Layer | Technology |
|---|---|
| Front-end framework | **React 18** + **TypeScript** |
| Build tooling | **Vite 6** (single-file production output in `dist/`) |
| Styling | **Tailwind CSS v4** with a custom design-token theme (`@theme` in `index.css`) |
| Type | Big Shoulders Display (display) · Public Sans (body) · IBM Plex Mono (data) |
| PDF rendering/print | **pdf.js** (`pdfjs-dist`, main-thread "fake worker" path) |
| Maps & geocoding | OpenStreetMap embeds + Nominatim reverse geocoding (no API key) |
| Back-end API | **Django 6.1** + Django REST Framework |
| Real-time push | **Django Channels** + **channels-redis** over **Redis**, served by **Daphne** (ASGI) |
| Database | **PostgreSQL + PostGIS** (geotags stored as `PointField`; spatial barangay lookups) |
| Auth | Token auth (DRF) with role-based permission mirroring the front-end |

---

## Architecture — two modes

```
STANDALONE (this repo, as-is)                 LAN DEPLOYMENT (backend/)
┌──────────────┐                              ┌──────────────┐   REST + WS    ┌──────────────────┐
│   Browser    │                              │   Browsers   │ ─────────────▶ │  Django 6.1      │
│  React app   │                              │  (every PC   │   Token auth   │  Channels/Daphne │
│  localStorage│                              │   on the LAN)│ ◀───────────── │                  │
└──────────────┘                              └──────────────┘   push events  └───────┬──────────┘
                                                                                     │
                                                                              ┌──────┴───────┐
                                                                              │ PostGIS      │ Redis
                                                                              │ (papers,     │ (channel
                                                                              │  geotags)    │  layer)
                                                                              └──────────────┘
```

- **Standalone mode** — the entire system runs in the browser against `localStorage`.
  Ideal for demos, training, and this preview. Everything works; data lives on one
  machine and syncs across its tabs.
- **LAN mode** — `backend/` is a complete Django project that mirrors the data model
  1:1. Point the front-end at it through the adapter in `src/lib/api.ts` (each store
  action maps to one endpoint; `connectLive()` streams WebSocket pushes) and a paper
  transmitted on one PC reaches the recipient's board and taskbar bell in sub-second.
  Full walkthrough in [`DEPLOY.md`](DEPLOY.md).

---

## File structure

```
.
├── index.html                 # entry: branded boot screen, fail-safe watchdog
├── DEPLOY.md                  # LAN install guide (PostGIS, Redis, nginx, firewall)
├── README.md
│
├── src/                       # ── front-end ──────────────────────────────────
│   ├── main.tsx               # React mount
│   ├── App.tsx                # providers, error boundary, print center
│   │                          #   (routing + paperwork-detail sheets), attachment viewer
│   ├── index.css              # Tailwind v4 theme tokens, print CSS (@page A4),
│   │                          #   readability zoom, animations
│   ├── vite-env.d.ts
│   │
│   ├── lib/
│   │   ├── core.ts            # domain model: roles, org units, papers, custody,
│   │   │                      #   EXIF GPS reader, PDF stub generator,
│   │   │                      #   barangay extraction, demo seed (v18)
│   │   ├── store.tsx          # the single source of truth: auth, workflow actions,
│   │   │                      #   notifications, messaging, theming, persistence
│   │   └── api.ts             # front-end ↔ Django bridge (REST + WebSocket)
│   │
│   └── components/
│       ├── ui.tsx             # icon set, chips, avatars, Seal (logo-aware),
│       │                      #   SearchSelect (searchable dropdowns), toasts
│       ├── Login.tsx          # sign-in gate, sign-up w/ contact fields,
│       │                      #   forgot-password flow, quick-access tiles
│       ├── Shell.tsx          # sidebar nav, top bar, notification bell (taskbar
│       │                      #   badge), profile/password panel
│       ├── Board.tsx          # tracker board: drag-and-drop, filters
│       │                      #   (search, month, barangay, employee), assign modal
│       ├── Drawer.tsx         # paper detail: route sheet w/ receipt stamps,
│       │                      #   progress slider, PIC panel, evidence, custody
│       ├── NewDoc.tsx         # intake form: recipients, persons-in-charge, files
│       └── Pages.tsx          # dashboard, documents register, divisions (+OIC
│                              #   manager), activity, users & accounts, personnel
│                              #   boards, logs, messages, customize
│
├── public/                    # generated site photos used by demo papers
│
└── backend/                   # ── Django 6.1 API + real-time ─────────────────
    ├── manage.py
    ├── requirements.txt
    ├── config/                # settings (PostGIS, Channels, Redis), urls, asgi, wsgi
    └── core/
        ├── models.py          # User, Division, Paper, CustodyEntry, Attachment
        │                      #   (PostGIS PointField), Notification, Channel,
        │                      #   Message, SystemLog, Customization
        ├── views.py           # REST API: auth, papers (move/route/ack/progress/
        │                      #   assign/submit/return), divisions+OIC, users,
        │                      #   notifications, messaging, logs, customization
        ├── serializers.py     # lean payloads matching the front-end shapes
        ├── permissions.py     # role rules mirroring the front-end exactly
        ├── consumers.py       # WebSocket consumer (per-user + global groups)
        ├── realtime.py        # broadcast helpers — the "reaches instantly" piece
        ├── routing.py         # ws/live/ route
        ├── urls.py            # /api/… endpoints
        ├── admin.py
        └── management/commands/seed_oce.py   # seeds org structure + key accounts
```

---

## Quick start — front-end (standalone)

Requires **Node 18+**.

```bash
npm install
npm run dev          # local dev server (hot reload)
# — or —
npm run build        # production bundle in dist/ (single index.html + assets)
npm run preview      # serve the production build
```

Open the printed URL, sign in with any demo account (password `cityeng2026` —
quick-access tiles on the gate fill it for you).

---

## Quick start — back-end (Django + PostGIS on the LAN)

> Detailed step-by-step (GDAL, firewall, nginx, troubleshooting) in **[`DEPLOY.md`](DEPLOY.md)**.

```bash
# 1. System packages: PostgreSQL + PostGIS extension, Redis, GDAL/GEOS
# 2. Python environment
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Database
createdb oceflow
psql oceflow -c "CREATE EXTENSION postgis;"

# 4. Configure (see Environment variables) — then:
export OCE_DB_PASS=…  OCE_SECRET=…

python manage.py migrate
python manage.py seed_oce        # divisions, teams, desks, key accounts, channels
python manage.py collectstatic

# 5. Run (ASGI — serves HTTP + WebSockets together)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Every PC on the LAN then uses `http://<server-ip>:8000` (or front it with nginx per
`DEPLOY.md`). Create the admin superuser with `python manage.py createsuperuser` and
approve staff sign-ups from **Users & Accounts**.

---

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `OCE_SECRET` | *(change me)* | Django `SECRET_KEY` |
| `OCE_DEBUG` | `0` | Set `1` for development only |
| `OCE_DB_NAME` | `oceflow` | PostGIS database name |
| `OCE_DB_USER` | `oce` | Database user |
| `OCE_DB_PASS` | `oce_password` | Database password |
| `OCE_DB_HOST` / `OCE_DB_PORT` | `127.0.0.1` / `5432` | Database location |
| `OCE_REDIS_HOST` / `OCE_REDIS_PORT` | `127.0.0.1` / `6379` | Redis (Channels layer) |

---

## Accounts & roles

Seeded by `seed_oce` — all with password **`cityeng2026`** until changed.

| Account | Role | Scope |
|---|---|---|
| `admin` — Alphard S. Grande | Program admin (I.T. Section) | Everything: accounts, verification, password resets, logs, OIC for all units, delete, customization |
| `agrande` — Engr. Aries S. Grande | Dept. Head II (City Engineer) | All boards, oversight, activity log, Executive Council |
| `jsergio` — Engr. Julio B. Sergio | Asst. Dept. Head II (Asst. City Engineer) | Same; heads the Inspectorate Team |
| `bsalonga` — Ms. Bianca Salonga | Moderator | All boards + activity log, edit/delete papers, assign OIC — no account management |
| `rdomingo`, `nsalvador`, `lbartolome`, … | Division heads (×9) | Own division queue + trail; route, verify, assign PIC; manage own division only |
| Team heads (`ricadomingo`, `afajardo`) | Division-role team heads | Their team (DOC-MON, SUBAY); INSP-TEAM & IT headed by executives/admin |
| `pmanalo`, `kvillanueva`, … | Employee / Job-order | Personal *My Work Board*; update progress, submit to head; cannot route or complete |

Forgot-password approvals reset to the default **`OCE@2026`**.

---

## The print center

Government-form output on **A4 with 0.25 cm margins**, letterhead + seal, prepared-by /
noted-by signature blocks, and full-color tables:

- **Routing report** — daily / weekly / monthly, scoped per role (a division prints only
  its own routing; admin / executives / moderator choose any desk or all).
- **Paperwork detail** — route sheet, custody trail, site map + geotag table
  (*Site barangay* column), photo grid, and **every page of attached PDFs** rendered at
  print resolution via pdf.js (not just the first page).
- **Activity log** and **user history log** prints.

Open any paper → **Print paperwork**, or the printer icons in the top bar / register.
The dialog's own settings should read *A4 · Default margins* so the CSS applies cleanly.

---

## Customization

The **Customize** tab (program admin) rebrands the whole program, live:

- Organization name, tagline, description (sign-in gate, sidebar, prints)
- Logo: seal / gear / bridge, or an uploaded image — echoed on the boot screen
- Theme: primary + secondary accents (presets or color picker), background mood
  (Blueprint / Midnight / Slate)
- Barangay list merged into the board filter alongside auto-detected names

---

## Development notes

- **One store, many screens.** `src/lib/store.tsx` is the single source of truth; every
  action logs to the custody trail and system ledger, pushes a notification, and — in
  LAN mode — broadcasts over WebSocket. Swapping `localStorage` persistence for the
  Django API is a bounded change because all I/O flows through this store
  (`src/lib/api.ts` already mirrors every action endpoint-for-endpoint).
- **Searchable dropdowns** auto-degrade to native selects at ≤ 10 options.
- **Readability zoom** lives on `html` (`zoom: 1.18` in `index.css`) for 19″ office
  monitors; print cancels it and enlarges at the page level instead.
- **Data versioning** — the seed carries a `v` stamp (`v18`); bumping it re-seeds
  every client on next load, which is how org changes roll out.
- Fail-safe boot: `index.html` renders the branded boot screen in plain HTML and a
  watchdog surfaces any startup fault with a one-click *Clear data & reseed*.
