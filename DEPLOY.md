# OCE Flow — LAN Deployment (Django 6.1 + PostGIS)

Run the whole office on one server. Every client on the network opens the same
site, shares one database, and paperwork reaches the intended recipient
**instantly** over WebSockets.

```
                ┌─────────────────────────┐
                │   OFFICE SERVER (LAN)   │
                │  ┌───────────────────┐  │
  ┌──────────┐  │  │  daphne (ASGI)    │  │
  │ Client A ├─────►  Django 6.1 API   │  │
  ├──────────┤  │  │  + Channels WS    │  │
  │ Client B ├─────►                   │  │
  ├──────────┤  │  └─────┬─────────────┘  │
  │ Client C │  │        │                │
  └──────────┘  │   ┌────▼─────┐  ┌───────┴───┐
                │   │ PostGIS  │  │  Redis    │
                │   │ (data,   │  │ (realtime │
                │   │  points) │  │  bus)     │
                │   └──────────┘  └───────────┘
                └─────────────────────────┘
```

## 1. Server prerequisites (Ubuntu 24.04 shown)

```bash
sudo apt update
sudo apt install -y python3.12 python3.12-venv postgresql-16-postgis-3 redis-server \
                    gdal-bin libgdal-dev geos-bin libpq-dev
```

## 2. Database

```bash
sudo -u postgres psql
CREATE USER oce WITH PASSWORD 'oce_password';
CREATE DATABASE oceflow OWNER oce;
\c oceflow
CREATE EXTENSION postgis;        -- enables geometry/PointField
\q
```

## 3. Backend

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# point at your DB / Redis (or export as env vars)
export OCE_DB_NAME=oceflow OCE_DB_USER=oce OCE_DB_PASS=oce_password
export OCE_SECRET='a-long-random-string'   # CHANGE ME

python manage.py migrate          # creates tables (incl. PostGIS)
python manage.py seed_oce         # 9 divisions + 4 teams + 2 desks + accounts
python manage.py collectstatic --noinput
```

Seeded logins (password `cityeng2026`): `admin`, `agrande` (City Engineer),
`jsergio` (Asst. City Engineer), `bsalonga` (Moderator), and one head per division.

## 4. Run it (HTTP + WebSocket in one process)

```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

`0.0.0.0` makes it reachable from every machine on the LAN at
`http://<server-ip>:8000`. For production, put **nginx** in front (below) so you
also serve uploads and the built front-end.

## 5. Front-end

The React app in `src/` currently persists to `localStorage` (single-browser).
To make it multi-client, point its persistence at this API via the adapter in
`src/lib/api.ts` — it already mirrors every store action to an endpoint and
opens the WebSocket. Then:

```bash
VITE_API_URL=http://<server-ip>:8000/api npm run build
```

Serve `dist/` with nginx alongside the API.

## 6. nginx (single origin, LAN)

```nginx
server {
    listen 80;
    server_name _;

    root /srv/oceflow/dist;              # built front-end
    index index.html;

    location / { try_files $uri /index.html; }

    location /api/ { proxy_pass http://127.0.0.1:8000; }
    location /ws/  {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    location /media/ { alias /srv/oceflow/backend/media/; }   # JPG/PDF evidence
}
```

## 7. Firewall

```bash
sudo ufw allow 80/tcp    # nginx (or 8000/tcp if running daphne directly)
```

## How "immediate delivery" works

1. A head POSTs to create/route a paper.
2. The view writes the row, custody entries, system log and notifications,
   then calls `realtime.broadcast(...)` with the recipient user ids.
3. The Channels layer (Redis) pushes a `paper.*` event over each recipient's
   WebSocket (`ws://<server>/ws/live/`).
4. The client's store applies the event — the paper appears on their board and
   the bell/taskbar pings — **without a page reload** (sub-second).

If WebSockets are ever blocked, the client can fall back to polling
`GET /api/papers` every few seconds; the adapter notes where.

## Troubleshooting

- **`ImportError: GDAL`** — install `gdal-bin libgdal-dev` (step 1).
- **WS connects but no events** — ensure Redis is running: `systemctl status redis-server`.
- **Geotags not mapping** — PostGIS stores `lng,lat` as a `Point`; the API
  returns `lat`/`lng` via the serializer (`.y` / `.x`).
- **Attachments 404** — check `/media/` alias and that `MEDIA_ROOT` is writable.
