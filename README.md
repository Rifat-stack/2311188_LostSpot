# 📍 LostSpot

**Lost something on campus? Found something that isn't yours?** LostSpot is a small web app where students post lost and found items together with *where* it happened, so owners and finders can find each other.

Made by **Rifat Abdullah Khan (2311188)** for CSE309.

Live site: https://2311188project-name.vercel.app · API docs: https://2311188project-name.vercel.app/api/docs

---

## What you can do (MVP)

- **Report** a lost or found item: what it is, where, which day, a description and how to contact you
- **Browse** every post as cards, newest first
- **Filter** by Lost or Found, **search** by name, place or description, and hide items that were already returned
- **Open** an item to see everything about it
- **Edit** a post, **mark it returned** to its owner, or **delete** it

Coming in the Beta: accounts, building floor maps with pins, claiming a found item with a secret question, and an admin page.

## Built with

| Part | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, React-Bootstrap (Bootstrap 5), React Router |
| Backend | Python, FastAPI, SQLModel |
| Database | PostgreSQL on Supabase (online), SQLite file (on my computer) |
| Hosting | Vercel |

## How a request travels

```
 Browser (React)                    Backend (FastAPI)                        Database
 ───────────────                    ─────────────────                        ────────
 HomePage / ItemPage
      │  calls a function in
      ▼
 src/api/items.ts  ── HTTP ──▶  router.py ──▶ service.py ──▶ repository.py ──▶ items table
                     ◀── JSON ──  (routes)      (rules)        (queries)
```

- **router.py** receives the request and sends the answer back.
- **service.py** checks the rules, for example "the date can't be in the future".
- **repository.py** is the only file that reads or writes the database.

## The API

| Method | URL | What it does |
|---|---|---|
| GET | `/api/items` | List all items (add `?kind=lost`, `?kind=found` or `?search=key` to filter) |
| POST | `/api/items` | Create an item |
| GET | `/api/items/5` | Get item number 5 |
| PUT | `/api/items/5` | Update item number 5 |
| DELETE | `/api/items/5` | Delete item number 5 |

Example body for POST and PUT (PUT also needs `"is_returned": true` or `false`):

```json
{
  "kind": "lost",
  "item_name": "Black car key",
  "location": "CSE Building, Floor 2, near Lab 1",
  "date_happened": "2026-11-06",
  "description": "Toyota key with a red keychain",
  "contact": "2311188@iub.edu.bd"
}
```

You can try every endpoint in the browser at `/api/docs`.

## Folder guide

```
backend/
  main.py              starts the app and creates the tables
  app/config.py        decides which database to use
  app/database.py      database connection
  app/items/           everything for items: models, schemas, repository, service, dependencies, router
frontend/
  src/api/items.ts     every call to the backend
  src/pages/           HomePage (the list) and ItemPage (one item)
  src/components/      Sidebar, ItemRow, ItemFormDrawer (the slide-in form)
docs/                  PRD, SRS and TDD
```

## Run it on your computer

You need **Python 3.10+** and **Node.js 22+**. Open two terminals.

**Terminal 1 – backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
fastapi dev main.py
```

**Terminal 2 – frontend**

```bash
cd frontend
npm install
npm run dev
```

Now open http://localhost:5173. The API docs are at http://localhost:8000/api/docs.

The next time, you can skip `python -m venv`, `pip install` and `npm install`.

On your computer the data is saved in `backend/lostspot.db`. Delete that file if you want to start with an empty list.

## Put it online

1. Create a free project on [Supabase](https://supabase.com). Click **Connect → Transaction pooler** and copy the connection string (it ends with `:6543/postgres`). Put your database password into it.
2. Import this repository on [Vercel](https://vercel.com).
3. In Vercel, open **Settings → Environment Variables** and add `DATABASE_URL` with the Supabase connection string.
4. Deploy. The `items` table is created automatically on the first request.

Never put the database password in the code or in GitHub.

## How I work on this repo

Every change starts with a GitHub issue. I make a branch named `rifat/#<issue number>-<short-title>`, write commits like `feat: add search to the item list (#4)`, and open a pull request that says `Closes #<issue number>`. After it is merged into `main`, Vercel deploys it.

## Documents

- [Product Requirements Document (PRD)](docs/01-prd.md)
- [Software Requirements Specification (SRS)](docs/02-srs.md)
- [Technical Design Document (TDD)](docs/03-tdd.md)
