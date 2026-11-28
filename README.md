# LostSpot

**Lost something on campus? Found something that isn't yours?** LostSpot is a web app where students post lost and found items, with *where* and *when* it happened, so owners and finders can find each other. Desk teams can work together in groups, and admins look after the whole board.

Made by **Rifat Abdullah Khan (2311188)** for CSE309.

| | |
|---|---|
| Live site | https://2311188project-name.vercel.app |
| API docs | https://2311188project-name.vercel.app/api/docs |
| Final report | [docs/FINAL_REPORT.md](docs/FINAL_REPORT.md) |

---

## Test accounts for the instructor

The login page lists the test accounts (two admins and two users) with their demo passwords, so they can be copied straight into the form. All five accounts and their passwords are also in the submission form and the report PDF.

| User ID (email) | Role | In the shared group |
|---|---|---|
| _(admin 1 email)_ | admin | no |
| _(admin 2 email)_ | admin | no |
| _(user 1 email)_ | user | **owner** |
| _(user 2 email)_ | user | member: create, update, assign |
| _(user 3 email)_ | user | member: create only |

**The shared group:** _(group name)_, owned by user 1. User 2 may post, edit group posts and assign them to members. User 3 may only post.

Some things to try:

- Log in as **user 3** and open a group post that isn't theirs. There are no edit buttons, and the server would answer 403 anyway. Opening `/admin` shows "No access".
- Log in as **user 2** and open a group post. They can edit it and assign it to a member.
- Log in as **user 1** and open the group. They can tick each member's permissions, add members, rename the group or delete it.
- Log in as **admin 1** and open the Admin dashboard: ban user 3 with a reason (they are thrown out on their next click), then look at the activity log, the security view and the CSV exports. Admin 1 can't change their own role and can't ban admin 2.

**How the admins were made:** everyone signs up as a normal `user`. There is no way to make yourself an admin through the app. The first admins were made by changing the `role` column of their row in the `users` table in Supabase to `admin`. After that, an admin can change other users' roles in the dashboard.

## What it does

**Everyone:** browse and search all posts, filter lost or found, hide returned items.

**Users** (sign up with any email):
- Post a lost or found item, as a personal post or into a group, and pick where it happened on a map of the 5th floor of the Academic Building (the chosen room turns green, and the post's page shows it on the map)
- Edit, mark returned or delete **only their own** posts, and see them on "My posts"
- Change their name and password, see where they are logged in, and end any of those sessions
- Create groups and decide what each member may do

**Group members**, depending on what the owner allows:
- `create`: post in the group
- `update`: edit group posts and mark them returned
- `assign`: give a group post to a member to handle

Only the owner may rename the group, delete it or manage members.

**Admins** get an admin dashboard with:
- **Overview:** statistics
- **Users:** search, role and status filters, pages, ban and unban with a reason (one or many at once), change role, end sessions, and a detail page with the user's posts, groups, sessions and activity
- **Content:** every post and group, with filters, delete one or many
- **Activity log:** logins, failed logins, logouts, password changes, role changes, bans, deletes and exports, with IP address and browser, plus filters and search
- **Security:** failed logins by IP and by account, and locked accounts
- **CSV export:** users, posts and activity, using the filters on screen

## Security in short

- Passwords are hashed with **Argon2id**, plus a secret **pepper** from an environment variable.
- The **access token** is a JWT that lasts 15 minutes. It holds the user id, role and session id, and is kept only in the page's memory.
- The **refresh token** sits in an **httpOnly cookie**, so JavaScript can't read it. It is stored only as a hash and **rotates** on every use.
- **Logout** and **ending a session** stop both tokens at once. A **ban** works on the user's very next request.
- All permission rules live in one file, [`backend/app/rbac.py`](backend/app/rbac.py), and the server checks them on every request. The buttons in the UI follow the same rules, but they are not what keeps the data safe.
- After 5 wrong passwords an account is locked for 15 minutes, and one IP address can't fail more than 20 times in 15 minutes.
- No secrets are in this repository. [`.env.example`](.env.example) lists only their names.

## Built with

| Part | Tools |
|---|---|
| Frontend | React, TypeScript, Vite, React-Bootstrap (Bootstrap 5), React Router |
| Backend | Python, FastAPI, SQLModel, PyJWT, pwdlib (Argon2) |
| Database | PostgreSQL on Supabase (online), SQLite file (on my computer) |
| Tests | pytest |
| Hosting | Vercel |

## How a request travels

```
 Browser (React)                       Backend (FastAPI)
 ───────────────                       ─────────────────
 a page calls src/api/*.ts
   └─ api/client.ts adds "Authorization: Bearer <access token>"
          │
          ▼
       router.py ── Depends(...) ──▶ check the login and the role  (users/dependencies.py, rbac.py)
          │                                 401 / 403 if not allowed
          ▼
       service.py  ── the rules (ownership, group permissions, dates)
          ▼
       repository.py ── database queries ──▶ Supabase tables
```

If the access token has expired, the server answers 401. `api/client.ts` then calls `/api/auth/refresh` once (the cookie goes along by itself), gets a new token, and repeats the request.

## The API

| Area | Endpoints |
|---|---|
| Login | `POST /api/auth/register`, `/login`, `/refresh`, `/logout` |
| My account | `GET/PATCH /api/users/me`, `PUT /api/users/me/password`, `GET /api/users/me/sessions`, `DELETE /api/users/me/sessions/{id}` |
| Posts | `GET /api/items` (anyone), `GET /api/items/mine`, `POST /api/items`, `GET/PUT/DELETE /api/items/{id}`, `PUT /api/items/{id}/assign` |
| Groups | `GET/POST /api/groups`, `GET/PATCH/DELETE /api/groups/{id}`, `POST /api/groups/{id}/members`, `PATCH/DELETE /api/groups/{id}/members/{user_id}` |
| Admin | `/api/admin/stats`, `/users`, `/users/{id}`, `…/ban`, `…/unban`, `…/role`, `…/revoke-sessions`, `/users/bulk-ban`, `/users/bulk-unban`, `/items`, `/items/delete`, `/groups`, `/groups/delete`, `/activity`, `/security`, `/export/{users,items,activity}.csv` |

Every endpoint can be tried at `/api/docs`. For the ones that need login, click **Authorize** and paste an access token.

## Folder guide

```
backend/
  main.py              the app: CORS, error handler, routers, tables
  app/config.py        settings from environment variables
  app/database.py      database connection, and adds new columns to the old items table
  app/rbac.py          every permission rule: roles, ownership, groups
  app/users/           sign up, login, tokens, sessions, profile
  app/items/           lost and found posts (places.py: the 5th-floor places a post may use)
  app/groups/          groups and members
  app/activity/        the activity log
  app/admin/           the admin dashboard API
  tests/               pytest tests
frontend/src/
  api/client.ts        access token in memory, refresh on 401, CSV downloads
  api/*.ts             one function per endpoint
  AuthContext.tsx      who is logged in (restored from the cookie when the page opens)
  components/          Layout, Sidebar (menu by role), Guards, ItemRow, ItemFormDrawer, FloorMap, Pager, AskModal
  floorPlan.ts         the rooms and areas of the 5th floor, drawn by FloorMap
  pages/               Home, Item, My posts, Groups, Group, Login, Signup, Profile
  pages/admin/         Overview, Users, User detail, Content, Activity log, Security
docs/                  PRD, SRS, TDD, and the final report
```

## Run it on your computer

You need **Python 3.10+** and **Node.js 22+**. Open two terminals.

**Terminal 1, backend**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Mac/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
fastapi dev main.py
```

**Terminal 2, frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. On your computer the data is saved in `backend/lostspot.db`. Delete it to start fresh.

**Tests:** `cd backend` then `python -m pytest`.

## Put it online

1. Create a Supabase project and copy the **Transaction pooler** connection string (port `6543`).
2. Import this repository on Vercel.
3. In **Settings → Environment Variables**, add every name from [`.env.example`](.env.example): `DATABASE_URL`, `JWT_SECRET`, `PASSWORD_PEPPER`, and `FRONTEND_ORIGINS` (your Vercel URL). Make each secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
4. Deploy. The tables and the new columns are created on the first request.
5. Sign up the accounts on the live site. To make someone an admin, open Supabase → **Table Editor → users**, change their `role` from `user` to `admin` and save. It works on their next request.

## How I work on this repo

Every change starts with a GitHub issue. The mid-term work and the final project went through branches named `rifat/#<issue>-<short-title>` and pull requests that say `Closes #<issue>`. Newer changes, like the 5th-floor map (#9), are uploaded straight to `main` with GitHub's "Upload files" page, with the issue number in the commit message. Vercel deploys `main` every time it changes.
