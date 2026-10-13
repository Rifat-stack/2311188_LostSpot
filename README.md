# LostSpot

LostSpot is a lost and found web app for campus that is built around **where** things go missing. Instead of scrolling through a feed of posts, you open a building, pick a floor, and see lost and found items placed right on its floor map.

```
       Floor 2
┌─────────────────────┐
│ Lab 1     📍        │
│                     │
│       Corridor      │
│              🔑     │
│                     │
│ Classroom           │
└─────────────────────┘
```

Someone who lost a black car key marks the area around Lab 1 and the corridor, with the time they were there. Someone who finds a key in the corridor can open the same floor, see the post, and report it as found.

> **Status:** Planning. The PRD, SRS and TDD are done. MVP development starts next.

## Features

### MVP (demo before mid-term)

- Post a **lost** item with a category, description, time window and an area on the floor map
- Post a **found** item with an exact pin, the time it was found and where it was left
- Floor map view per building and floor, with found items as pins and lost items as circles
- List view with search and filters (type, category, building, floor, status, date)
- "I found it" report on a lost item
- Edit, delete, resolve or reopen a post with the edit key you get when posting (no accounts yet)
- Supabase PostgreSQL in production, SQLite locally, deployed on Vercel

### Beta (demo before final)

- Sign up and log in with a university email (JWT + refresh token)
- Profile: change name and password, see all your posts
- `user` and `admin` roles
- Photo upload on items
- Claim flow: the finder sets a hidden verification question, and the owner has to answer it
- Match suggestions between lost and found items (same floor, same category, inside the lost area, within the time window)
- Admin dashboard with stats, remove posts, ban / unban users, add buildings and floor plans
- Security hardening: rate limits, login lockout, CORS and security headers

Out of scope this semester: automated tests, CI/CD, native apps, notifications and chat.

## Tech stack

| Part | Technology |
|---|---|
| Backend | FastAPI, SQLModel |
| Database | Supabase PostgreSQL (production), SQLite (local) |
| Frontend | React + Vite |
| Floor maps | Leaflet (`react-leaflet`, `CRS.Simple` with floor plan images) |
| Hosting | Vercel |
| Beta | Alembic, PyJWT, Argon2, Supabase Storage |

## Documentation

| Document | What it covers |
|---|---|
| [Product Requirements Document (PRD)](docs/01-prd.md) | Problem, goals, users, scope, features, user stories, metrics, milestones |
| [Software Requirements Specification (SRS)](docs/02-srs.md) | Functional and non-functional requirements, validation, permissions, acceptance criteria, traceability |
| [Technical Design Document (TDD)](docs/03-tdd.md) | Architecture, data model, floor map design, matching logic, API, security, deployment |

## Project structure

```
lostspot/
├── api/            # FastAPI backend (Vercel serverless function)
├── frontend/       # React + Vite app
├── scripts/        # Seed script for buildings and floors
├── docs/           # PRD, SRS, TDD
├── requirements.txt
└── vercel.json
```

## Run locally

You need Python 3.11+ and Node.js 20+.

**Backend**

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # then fill in the values
python scripts/seed.py           # creates tables and sample buildings / floors
uvicorn api.index:app --reload --port 8000
```

API docs are at http://localhost:8000/api/docs.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173 and sends `/api` requests to the backend.

## Environment variables

| Variable | Release | Description |
|---|---|---|
| `DATABASE_URL` | MVP | `sqlite:///./lostspot.db` locally, Supabase pooler URL in production |
| `FRONTEND_ORIGIN` | MVP | Frontend URL, used for CORS |
| `JWT_SECRET` | Beta | Long random secret for signing tokens |
| `ACCESS_TOKEN_MINUTES` | Beta | Access token lifetime, default `15` |
| `REFRESH_TOKEN_DAYS` | Beta | Refresh token lifetime, default `7` |
| `ALLOWED_EMAIL_DOMAINS` | Beta | University email domains allowed to sign up |
| `SUPABASE_URL` | Beta | Supabase project URL (Storage) |
| `SUPABASE_SERVICE_KEY` | Beta | Server-only key for uploads |
| `STORAGE_BUCKET` | Beta | Bucket for photos and floor plans |

Secrets live in your local `.env` file and in Vercel's environment variables. **Never commit them to Git.**

## Deploy to Vercel

1. Import this repository in Vercel.
2. Add the environment variables above for Preview and Production.
3. For `DATABASE_URL`, use Supabase's transaction pooler connection string (port 6543).
4. Push to a branch to get a preview deployment. Merging into `main` deploys to production.

`vercel.json` sends `/api/*` to the FastAPI app and everything else to the React build, which is why the API docs live at `/api/docs`.

## Contributing

- Branch names: `name/#{issue_number}-{task-title}`, for example `rifat/#1-create-prd-srs-tdd-and-update-readme`
- Commit messages follow Conventional Commits: `<type>: <summary> (#issue)`, for example `docs: write PRD for MVP and Beta (#1)`
- Every change goes through a pull request that links its issue with `Closes #<number>`
