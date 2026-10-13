# Technical Design Document (TDD): LostSpot

| | |
|---|---|
| **Product** | LostSpot |
| **Document** | Technical Design Document (TDD) |
| **Version** | 1.0 |
| **Date** | 13 October 2026 |
| **Author** | Rifat |
| **Related docs** | [PRD](01-prd.md) · [SRS](02-srs.md) |

---

## 1. Overview

This document explains how LostSpot will be built: the stack, the architecture, the data model, the floor map, the matching logic, the REST API and the security design. Requirement IDs (FR-xx, NFR-xx) refer to the [SRS](02-srs.md).

## 2. Tech stack

| Layer | Choice | Release | Why |
|---|---|---|---|
| Backend | FastAPI (Python) | MVP | Fast to write, automatic OpenAPI docs, Pydantic validation |
| ORM | SQLModel | MVP | One class for both the table and the schema |
| Database | Supabase PostgreSQL (production), SQLite (local) | MVP | Free hosted Postgres; SQLite needs no setup locally |
| Frontend | React + Vite | MVP | Fast dev server, simple build |
| Floor map | Leaflet (`react-leaflet`) with `CRS.Simple` and an image overlay | MVP | Treats a floor plan image as a flat map with zoom, pins and circles |
| Hosting | Vercel (static frontend + Python serverless function for `/api/*`) | MVP | Free, deploys from GitHub |
| Migrations | Alembic | Beta | Safe schema changes once real data exists |
| Auth | PyJWT (access + refresh tokens) | Beta | Simple, stateless access tokens |
| Password hashing | Argon2 (`argon2-cffi`) | Beta | Current recommended password hash |
| File storage | Supabase Storage | Beta | Item photos and floor plan uploads |

## 3. Architecture

```mermaid
flowchart LR
    B["Browser: React + Leaflet"] -->|"static files"| V["Vercel CDN"]
    B -->|"/api/v1/*"| F["FastAPI on Vercel serverless"]
    F -->|"SQLModel"| DB[("Supabase PostgreSQL")]
    F -->|"Beta: photos, floor plans"| S[("Supabase Storage")]
    B -->|"floor plan and photo URLs"| S
```

Vercel serves the React build as static files. Every request to `/api/*` is routed by `vercel.json` to the FastAPI app, which runs as a serverless function. The app talks to Supabase PostgreSQL. In the MVP, floor plan images are static files in the frontend's `public/floors/` folder; in Beta they and item photos live in Supabase Storage.

### 3.1 Request flow

1. The browser calls an endpoint, for example `GET /api/v1/items?floor_id=2`.
2. Vercel routes it to `api/index.py`.
3. The FastAPI router validates query and body with Pydantic schemas (`422` on failure).
4. Dependencies run: database session, and in Beta the current user and role checks.
5. The router calls a service function, which reads or writes through SQLModel.
6. The response is serialised through a response schema, which hides private fields (edit key hash, secret answer, contact for guests).

### 3.2 Post a lost item and report it found (MVP)

```mermaid
sequenceDiagram
    actor O as Owner
    actor F as Finder
    participant UI as React app
    participant API as FastAPI
    participant DB as PostgreSQL
    O->>UI: Draw circle on floor map, fill form
    UI->>API: POST /api/v1/items (type=lost)
    API->>API: Validate, generate edit key
    API->>DB: INSERT item (edit_key_hash)
    API-->>UI: 201 item + edit_key (shown once)
    UI-->>O: Show edit key, ask to save it
    F->>UI: Open same floor, see circle
    UI->>API: POST /api/v1/items/{id}/found-report
    API->>DB: UPDATE status = found_reported
    API-->>UI: 200 item
    O->>UI: Confirm with edit key
    UI->>API: POST /api/v1/items/{id}/resolve (X-Edit-Key)
    API->>DB: UPDATE status = resolved
    API-->>UI: 200 item
```

### 3.3 Login and refresh (Beta)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as React app
    participant API as FastAPI
    participant DB as PostgreSQL
    U->>UI: Email + password
    UI->>API: POST /api/v1/auth/login
    API->>DB: Find user, check ban and lockout
    API->>API: Verify Argon2 hash
    API->>DB: Save refresh token hash
    API-->>UI: access_token (15 min) + refresh_token (7 days)
    Note over UI,API: Later, access token expires
    UI->>API: POST /api/v1/auth/refresh
    API->>DB: Check hash, not revoked, not expired, user not banned
    API->>DB: Revoke old, save new refresh token hash
    API-->>UI: New token pair
```

### 3.4 Claim a found item (Beta)

```mermaid
sequenceDiagram
    actor C as Claimant
    actor F as Finder
    participant API as FastAPI
    participant DB as PostgreSQL
    C->>API: POST /api/v1/items/{id}/claims (answer, message)
    API->>DB: Check item is found and open, claimant is not finder, no earlier claim
    API->>DB: INSERT claim (pending)
    F->>API: GET /api/v1/items/{id}/claims
    API-->>F: Claims with answers + expected secret answer
    F->>API: POST /api/v1/claims/{claim_id}/approve
    API->>DB: Claim approved, other pending claims rejected, item claimed
    C->>API: GET /api/v1/items/{id}
    API-->>C: Item with finder contact and handoff note
```

## 4. Project structure

```
lostspot/
├── api/
│   ├── index.py              # FastAPI app, mounts routers under /api/v1, docs at /api/docs
│   ├── core/
│   │   ├── config.py         # Settings read from environment variables
│   │   ├── db.py             # Engine and session dependency
│   │   └── security.py       # Edit keys (MVP); JWT, Argon2, role checks (Beta)
│   ├── models/               # SQLModel tables: building, floor, item, user, refresh_token, claim
│   ├── schemas/              # Request and response models
│   ├── routers/              # buildings, items, auth, users, claims, admin
│   └── services/             # items, matching, claims, stats
├── frontend/
│   ├── public/floors/        # MVP floor plan images
│   └── src/
│       ├── api/              # fetch helpers
│       ├── components/       # FloorMap, ItemPin, LostArea, ItemForm, Filters
│       └── pages/            # MapPage, ListPage, ItemPage, (Beta) Login, Profile, Admin
├── scripts/seed.py           # Creates buildings and floors
├── alembic/                  # Beta migrations
├── docs/                     # PRD, SRS, TDD
├── requirements.txt
└── vercel.json
```

## 5. Data model

### 5.1 ERD

```mermaid
erDiagram
    BUILDING ||--o{ FLOOR : has
    FLOOR ||--o{ ITEM : contains
    APP_USER ||--o{ ITEM : posts
    APP_USER ||--o{ REFRESH_TOKEN : has
    APP_USER ||--o{ CLAIM : makes
    ITEM ||--o{ CLAIM : receives

    BUILDING {
        int id PK
        string name
        string code
        datetime created_at
    }
    FLOOR {
        int id PK
        int building_id FK
        int level
        string label
        string plan_image_url
        int plan_width
        int plan_height
    }
    ITEM {
        int id PK
        string type
        string title
        string description
        string category
        int floor_id FK
        float x
        float y
        float radius
        datetime time_from
        datetime time_to
        string handoff_note
        string contact
        string status
        string found_note
        datetime found_reported_at
        string edit_key_hash
        int owner_id FK
        string photo_url
        string verification_question
        string secret_answer
        datetime created_at
        datetime updated_at
        datetime resolved_at
    }
    APP_USER {
        int id PK
        string email
        string name
        string password_hash
        string role
        bool is_banned
        int failed_logins
        datetime locked_until
        datetime created_at
    }
    REFRESH_TOKEN {
        int id PK
        int user_id FK
        string token_hash
        datetime expires_at
        datetime revoked_at
    }
    CLAIM {
        int id PK
        int item_id FK
        int claimant_id FK
        string answer
        string message
        string status
        datetime created_at
    }
```

### 5.2 Tables

**MVP**

- `building`: campus buildings. `code` is short and unique (for example `CSE`).
- `floor`: one row per floor. `plan_width` and `plan_height` are the image size in pixels, used to convert relative coordinates.
- `item`: lost and found posts. `radius` and `time_to` are set only for lost items; `handoff_note` only for found items. `found_note` and `found_reported_at` are filled by a found report. `edit_key_hash` holds the SHA-256 of the edit key. Indexes on `(floor_id, status)`, `(category, status)` and `created_at`.

**Beta additions**

- `item.owner_id`, `item.photo_url`, `item.verification_question`, `item.secret_answer`. `edit_key_hash` becomes nullable and is no longer used for new items.
- `app_user`: `role` is `user` or `admin`. `email` is unique and stored in lowercase.
- `refresh_token`: stores only a SHA-256 hash of each refresh token.
- `claim`: `status` is `pending`, `approved` or `rejected`. Unique on `(item_id, claimant_id)`.

Match suggestions are calculated on request, so there is no match table.

## 6. Floor map design

- Each floor has one plan image. The map uses Leaflet's `CRS.Simple`, with the image placed as an `ImageOverlay` covering bounds `[[0, 0], [plan_height, plan_width]]`.
- Positions are stored **relative to the image**: `x` and `y` from 0 to 1 (`x` from the left, `y` from the top). The frontend converts them to map coordinates with `lat = (1 - y) * plan_height` and `lng = x * plan_width`. Because they are relative, replacing an image with a higher-resolution version doesn't break existing pins.
- `radius` is relative to `plan_width` (0.1 means a circle whose radius is 10% of the image width).
- Found items are drawn as pins with a category icon. Lost items are drawn as semi-transparent circles. Clicking either opens a small card with a link to the item page.
- To post, the user taps the map: for a found item this places the pin; for a lost item it places the centre, and a slider sets the radius.
- MVP floor plans are simple images drawn by the team (for example one PNG per floor of the CS building), stored in `frontend/public/floors/`.

## 7. Matching logic (Beta)

For a lost item `L`, a found item `F` is a match when all of these hold:

1. `F.type = found`, `F.status = open`, `F.floor_id = L.floor_id`, `F.category = L.category`.
2. `L.time_from ≤ F.time_from ≤ L.time_to + 48 hours`.
3. The pin is inside the lost area, using pixel distance so that non-square images work:

```
dx = (F.x - L.x) * plan_width
dy = (F.y - L.y) * plan_height
distance = sqrt(dx² + dy²)
match if distance ≤ L.radius * plan_width
```

Steps 1 and 2 run as a SQL filter. Step 3 runs in Python on the (small) filtered list. Results are sorted by distance and limited to 10. The same function run the other way gives "lost items that may belong to this found item".

## 8. REST API

All endpoints are under `/api/v1`. OpenAPI docs are at `/api/docs` (not `/docs`, because `vercel.json` sends only `/api/*` to the backend). Errors use FastAPI's default shape `{"detail": "..."}`.

### 8.1 MVP endpoints

| Method | Path | Who can call | Description |
|---|---|---|---|
| `GET` | `/health` | Anyone | Health check |
| `GET` | `/buildings` | Anyone | List buildings |
| `GET` | `/buildings/{id}/floors` | Anyone | Floors of a building with plan URL and size |
| `GET` | `/items` | Anyone | List items. Query: `type`, `category`, `building_id`, `floor_id`, `status`, `from`, `to`, `q`, `limit` (default 50, max 100), `offset` |
| `GET` | `/items/{id}` | Anyone | Item details |
| `POST` | `/items` | Anyone | Create a lost or found item. Returns `edit_key` once |
| `PATCH` | `/items/{id}` | Holder of edit key | Update fields. Header `X-Edit-Key` |
| `DELETE` | `/items/{id}` | Holder of edit key | Delete item |
| `POST` | `/items/{id}/found-report` | Anyone | Report a lost item as found. Body: `note` |
| `POST` | `/items/{id}/resolve` | Holder of edit key | Mark resolved |
| `POST` | `/items/{id}/reopen` | Holder of edit key | Reject a found report, back to `open` |

Example create request:

```json
POST /api/v1/items
{
  "type": "lost",
  "title": "Black car key",
  "category": "keys",
  "description": "Toyota key with a red keychain",
  "floor_id": 2,
  "x": 0.62,
  "y": 0.48,
  "radius": 0.15,
  "time_from": "2026-10-13T15:00:00+06:00",
  "time_to": "2026-10-13T16:00:00+06:00",
  "contact": "rifat@example.edu"
}
```

Response `201`:

```json
{
  "item": { "id": 17, "type": "lost", "status": "open", "...": "..." },
  "edit_key": "k3Q9...save-this-it-is-shown-once"
}
```

### 8.2 Beta endpoints

From Beta on, item endpoints use the logged-in user instead of `X-Edit-Key`. "Owner" means the user who created that item.

| Method | Path | Who can call | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Guest | Create account (allowed email domains only) |
| `POST` | `/auth/login` | Guest | Get access and refresh tokens |
| `POST` | `/auth/refresh` | Holder of refresh token | Rotate tokens |
| `POST` | `/auth/logout` | User | Revoke refresh token |
| `GET` | `/users/me` | User | Own profile |
| `PATCH` | `/users/me` | User | Change name |
| `POST` | `/users/me/password` | User | Change password |
| `GET` | `/users/me/items` | User | Own items |
| `POST` | `/items` | User | Create item (optional `verification_question`, `secret_answer` for found items) |
| `PATCH` | `/items/{id}` | Owner, admin | Update item |
| `DELETE` | `/items/{id}` | Owner, admin | Delete item |
| `POST` | `/items/{id}/resolve` | Owner, admin | Mark resolved |
| `POST` | `/items/{id}/reopen` | Owner, admin | Back to `open` |
| `POST` | `/items/{id}/found-report` | User (not owner) | Report lost item as found |
| `POST` | `/items/{id}/photo` | Owner, admin | Upload photo (multipart) |
| `GET` | `/items/{id}/matches` | Owner, admin | Match suggestions |
| `POST` | `/items/{id}/claims` | User (not owner) | Claim a found item |
| `GET` | `/items/{id}/claims` | Owner, admin | List claims with answers |
| `POST` | `/claims/{id}/approve` | Item owner, admin | Approve claim |
| `POST` | `/claims/{id}/reject` | Item owner, admin | Reject claim |
| `GET` | `/admin/stats` | Admin | Dashboard stats |
| `DELETE` | `/admin/items/{id}` | Admin | Remove item (status `removed`) |
| `GET` | `/admin/users` | Admin | List users |
| `POST` | `/admin/users/{id}/ban` | Admin | Ban user and revoke their refresh tokens |
| `POST` | `/admin/users/{id}/unban` | Admin | Unban user |
| `POST` | `/admin/buildings` | Admin | Create building |
| `POST` | `/admin/buildings/{id}/floors` | Admin | Add floor with plan image |

## 9. Security design

### 9.1 Edit keys (MVP)

- On create, the server makes a key with `secrets.token_urlsafe(24)` (192 bits), stores `sha256(key)` and returns the key once.
- Protected item endpoints read `X-Edit-Key`, hash it and compare with `hmac.compare_digest`. Wrong or missing key returns `403`.
- The UI shows the key in a box with a copy button and also saves it in the browser's `localStorage` so the poster can manage the item from the same device.

### 9.2 Authentication (Beta)

- Passwords hashed with Argon2id (`argon2-cffi` defaults).
- Access token: JWT signed with HS256 using `JWT_SECRET`, claims `sub` (user id), `role`, `exp` (15 minutes). Sent as `Authorization: Bearer <token>`.
- Refresh token: random string, 7 days. Only its SHA-256 hash is stored. Each refresh revokes the old token and issues a new one. If a revoked token is used again, all of that user's refresh tokens are revoked.
- Login lockout: `failed_logins` increases on each wrong password. At 5, `locked_until = now + 15 min` and login returns `429`. A successful login resets the counter.
- Changing a password or being banned revokes all refresh tokens.

### 9.3 Authorisation (Beta)

FastAPI dependencies keep the checks in one place:

- `get_current_user`: decodes the JWT, loads the user, rejects banned users with `403`.
- `get_optional_user`: same, but returns `None` for guests (used to hide contact details).
- `require_admin`: `403` unless `role = admin`.
- `get_owned_item`: loads the item and allows only its owner or an admin.

### 9.4 Claim verification (Beta)

The secret answer is stored as plain text because the finder has to compare it with free-text answers by eye ("red keychain" vs "it has a red key ring"). It is never included in responses except to the finder and admins. Each user can claim an item only once, and claims are rate limited (NFR-14), so guessing is not practical.

### 9.5 Other measures

- Pydantic validation on every input (SRS section 5).
- Response schemas leave out `edit_key_hash`, `secret_answer` and, for guests in Beta, `contact`.
- CORS limited to `FRONTEND_ORIGIN` (Beta).
- Security headers added by a small middleware (Beta).
- Rate limiting with a simple per-user / per-IP counter table, since serverless functions don't share memory (Beta).
- Photo uploads: check content type and size (2 MB), rename to a random file name, store in a public-read bucket.

## 10. Admin dashboard stats (Beta)

`GET /api/v1/admin/stats` returns:

```json
{
  "items_by_type_status": { "lost": { "open": 12, "found_reported": 3, "resolved": 20 }, "found": { "open": 8, "claimed": 2, "resolved": 15 } },
  "resolution_rate": 0.58,
  "items_per_building": [ { "building": "CSE", "count": 41 } ],
  "items_last_7_days": 9,
  "avg_hours_to_resolve": 19.5,
  "users": { "total": 64, "banned": 1 }
}
```

Each number comes from one `GROUP BY` query. With a few thousand rows this is fast enough without caching.

## 11. Configuration

| Variable | Release | Description |
|---|---|---|
| `DATABASE_URL` | MVP | Supabase Postgres URL in production, `sqlite:///./lostspot.db` locally |
| `FRONTEND_ORIGIN` | MVP | Frontend URL, used for CORS |
| `JWT_SECRET` | Beta | Long random secret for signing tokens |
| `ACCESS_TOKEN_MINUTES` | Beta | Default `15` |
| `REFRESH_TOKEN_DAYS` | Beta | Default `7` |
| `ALLOWED_EMAIL_DOMAINS` | Beta | Comma-separated list of university email domains |
| `SUPABASE_URL` | Beta | Project URL for Storage |
| `SUPABASE_SERVICE_KEY` | Beta | Server-only key for uploads |
| `STORAGE_BUCKET` | Beta | Bucket name for photos and floor plans |

Secrets go in a local `.env` file (listed in `.gitignore`) and in Vercel's project environment variables. They are never committed.

## 12. Supabase setup

1. Create a Supabase project and copy the connection string from **Connect**.
2. Use the **transaction pooler** connection string (port 6543) for `DATABASE_URL`, because serverless functions open many short connections.
3. In `core/db.py`, create the engine with `poolclass=NullPool` so connections aren't kept between invocations.
4. Beta: create a Storage bucket named in `STORAGE_BUCKET` with public read access.

## 13. Migrations

- **MVP:** tables are created with `SQLModel.metadata.create_all()` when the seed script runs. This is fine while there is no real data.
- **Beta:** Alembic is added. The first migration matches the MVP schema; the second adds `app_user`, `refresh_token`, `claim` and the new `item` columns. Migrations are run by hand against Supabase before each deploy.

## 14. Deployment

1. Push to GitHub; Vercel builds a preview for every pull request.
2. `vercel.json` routes `/api/(.*)` to `api/index.py` and everything else to the React build.
3. Environment variables are set in the Vercel dashboard for Preview and Production.
4. Merging into `main` deploys to production. MVP is tagged `v0.1.0`, Beta `v0.2.0`.

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Floor plans are inaccurate or slow to draw | Pins land in the wrong place | Keep plans simple, start with one building and two floors |
| Edit key is lost by the poster (MVP) | Post can't be managed | Save key in `localStorage`; Beta replaces keys with accounts |
| Spam or fake posts in the MVP | Map gets cluttered | Accepted for the demo; Beta requires university login and rate limits |
| False claims | Item goes to the wrong person | Verification question, one claim per user, finder approves manually |
| Contact details exposed | Privacy issue | Optional in MVP with a warning; Beta hides contact from guests |
| Serverless cold starts on Vercel | First request is slow | Small dependency list; accept for a class project |
| Supabase free tier pauses inactive projects | Demo fails | Open the app the day before the demo |
| Too few posts to be useful | App looks empty | Seed demo data; show recent finds on the map by default |
