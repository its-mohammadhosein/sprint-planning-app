# Sprint Planning App — Build Instructions for AI Agent

You are building a small internal web app. Read this whole file before writing code. Follow it literally; where something is not specified, choose the simplest option and note it in `DECISIONS.md`.

---

## 1. Purpose

Our company has many teams (Front-end, Back-end, PC, Security, ...). Before each sprint, team leads schedule tasks for their teams and the head manager adds/removes tasks. Today this happens in Excel and the scrum master copy-pastes into Jira.

This app replaces the Excel step. It must:

- store teams, users, sprints and tasks
- show tasks in a clear, filterable table with story-point totals
- keep unscheduled tasks in a **Backlog** (tasks with no sprint)
- import tasks from Excel
- export a sprint's tasks as a **Jira-compatible CSV** (no Jira API integration)

**Keep it simple.** No approval workflow, no task history, no capacity planning, no Jira API. These are out of scope (see section 11).

---

## 2. Tech Stack (fixed)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, full-stack (route handlers as the API) |
| Database | PostgreSQL |
| ORM | Prisma |
| Sessions | **Redis** (server-side sessions, see section 5) |
| Redis client | `ioredis` |
| Password hashing | `bcrypt` (use `bcryptjs` only if the native `bcrypt` package fails to build) |
| Validation | Zod |
| Table UI | TanStack Table |
| Styling | Tailwind CSS |
| Excel read | `exceljs` |
| CSV write | `csv-stringify` |
| Local dev | Docker Compose for Postgres + Redis |

Do **not** use GraphQL. Do **not** use NextAuth/Auth.js; sessions are implemented manually on Redis as described below.

---

## 3. Data Model

Prisma schema is the source of truth; it must produce the equivalent of this SQL.

```sql
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE user_role     AS ENUM ('admin', 'member');

CREATE TABLE teams (
    id    SERIAL PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    role           user_role NOT NULL DEFAULT 'member',
    jira_username  TEXT UNIQUE,
    team_id        INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sprints (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    CONSTRAINT sprint_dates_valid CHECK (end_date >= start_date)
);

CREATE TABLE tasks (
    id            SERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    description   TEXT,
    story_points  NUMERIC(4,1) CHECK (story_points >= 0),
    priority      task_priority NOT NULL DEFAULT 'medium',
    assignee_id   INTEGER REFERENCES users(id)   ON DELETE SET NULL,
    team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    sprint_id     INTEGER REFERENCES sprints(id) ON DELETE SET NULL,  -- NULL = Backlog
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_team     ON users(team_id);
CREATE INDEX idx_tasks_sprint   ON tasks(sprint_id);
CREATE INDEX idx_tasks_team     ON tasks(team_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

Rules:

- **Backlog = `sprint_id IS NULL`.** Deleting a sprint moves its tasks to Backlog (`ON DELETE SET NULL`). There is no separate backlog table.
- The UI shows the user's **full name** (`first_name last_name`) in tables, but all user data is stored.
- `story_points` is called **ST** in the UI.
- `updated_at` must be refreshed on every task update (Prisma `@updatedAt`).
- Provide a seed script (`prisma/seed.ts`) creating: 4 teams (Front-end, Back-end, PC, Security), 1 admin user (credentials from env, see section 8), ~8 sample users, 3 sprints, ~30 sample tasks (some in Backlog). Seed must be safe to run only in development.

---

## 4. Roles & Permissions

Keep it minimal:

| Action | admin | member |
|---|---|---|
| View everything | yes | yes |
| Create/edit/delete/move tasks | yes | yes |
| Import Excel, export Jira CSV | yes | yes |
| Manage teams, users, sprints | yes | no |

(Assumption: any logged-in user may edit tasks. Do not build per-team restrictions.)

---

## 5. Authentication: Redis Sessions

Login is **email + password**. Sessions are stored **server-side in Redis**; the browser only holds an opaque session ID.

### Requirements

- On successful login: generate a session ID with `crypto.randomBytes(32).toString('hex')`.
- Store in Redis: key `sess:<sessionId>`, value JSON `{ userId, role, createdAt }`, with TTL = `SESSION_TTL_SECONDS` (default 28800 = 8h).
- **Sliding expiration:** on each authenticated request, refresh the TTL (`EXPIRE`).
- Cookie name `sid`, with: `httpOnly: true`, `secure: true` in production, `sameSite: 'lax'`, `path: '/'`, `maxAge` = session TTL. The cookie contains only the session ID, never user data.
- **Logout:** `DEL sess:<id>` and clear the cookie.
- Keep a Redis set `user_sessions:<userId>` of that user's session IDs so all sessions can be revoked when an admin changes a user's role/password or deletes the user.
- Load the user's current data from Postgres only when needed; the role in the session is used for authorization, so role changes must revoke that user's sessions.
- Rate-limit login: max 5 failed attempts per email+IP per 15 minutes (use a Redis counter with TTL). Return a generic "Invalid email or password" message.
- Passwords: hash with **bcrypt** using a cost factor of 12 (configurable via `BCRYPT_COST`, default 12). Minimum length 8, **maximum length 72** (bcrypt ignores bytes beyond 72, so reject longer passwords instead of silently truncating). Always compare with `bcrypt.compare`; never compare hashes manually.
- CSRF: for all mutating requests (POST/PUT/PATCH/DELETE), verify the `Origin` header matches the app's host; reject otherwise.

### Implementation notes

- Put session logic in `src/lib/session.ts` with these functions: `createSession(user)`, `getSession()`, `destroySession()`, `destroyAllUserSessions(userId)`.
- `ioredis` does **not** run in the Next.js Edge runtime. Therefore:
  - `middleware.ts` only checks that the `sid` cookie **exists** and redirects to `/login` if not (cheap check).
  - Real validation happens in server code through a `requireUser()` / `requireAdmin()` helper that every route handler and protected server component calls.
- Create the Redis client as a singleton (reuse across hot reloads in dev).
- Never trust the client for role; always read it from the Redis session.

---

## 6. Pages / UI

All pages require login except `/login`.

### `/login`
Email + password form.

### `/` (redirect to `/sprints/current`)
"Current" = the sprint whose date range contains today; if none, the latest sprint.

### `/sprints/[id]` — Sprint view (main screen)
- Sprint dropdown at the top to switch sprint. Show sprint dates.
- Task table columns: **Title, Team, Assignee (full name), ST, Priority**. Description is shown in an expandable row or side panel, not as a column.
- Filters: team, assignee, priority, text search on title. Filters are reflected in the URL query string so views are shareable.
- Sortable columns.
- Summary bar: total tasks and total ST for the current filters, plus **ST per team** for the sprint.
- Actions: add task, edit task (inline or modal), delete task, **move to Backlog**, **move to another sprint** (supports multi-select with checkboxes).
- Priority shown as colored badge (low = gray, medium = amber, high = red).
- Buttons: **Import from Excel**, **Export Jira CSV** (exports this sprint, honoring nothing but the sprint, not the UI filters).

### `/backlog` — Backlog view
Same table and filters, showing tasks where `sprint_id IS NULL`. Multi-select + **"Move to sprint…"** action (choose a sprint).

### `/admin/teams`, `/admin/users`, `/admin/sprints` (admin only)
Simple CRUD tables.
- Users: create with temporary password, edit name/email/jira username/team/role, reset password, delete.
- Sprints: name, start date, end date.
- Block deleting a team that still has tasks (show a clear error).

### UX rules
- Table must feel fast and Excel-like: keyboard-friendly forms, no full page reloads on edit (use optimistic updates or revalidation).
- Empty states with a short hint (e.g., "No tasks in this sprint yet").
- Show toast messages for success/errors.
- Responsive enough for a laptop screen; mobile is not a priority.

---

## 7. API (Next.js route handlers, JSON)

All endpoints require a valid session; `/api/admin/*` requires role `admin`. Validate every input with Zod. Return `{ error: string }` with proper status codes on failure.

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/tasks?sprintId=<id|backlog>&teamId=&assigneeId=&priority=&q=
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/move        body: { taskIds: number[], sprintId: number | null }

GET    /api/sprints
GET    /api/teams
GET    /api/users             (id, full name, team; no password hash, ever)

POST   /api/import/preview    multipart .xlsx -> parsed rows + per-row validation
POST   /api/import/commit     body: validated rows + target sprintId (or null = Backlog)
GET    /api/export/jira?sprintId=<id>   -> CSV download

/api/admin/teams    (GET, POST, PATCH /:id, DELETE /:id)
/api/admin/users    (GET, POST, PATCH /:id, DELETE /:id, POST /:id/reset-password)
/api/admin/sprints  (GET, POST, PATCH /:id, DELETE /:id)
```

Never return `password_hash` from any endpoint.

---

## 8. Environment Variables

Provide `.env.example`:

```
DATABASE_URL=postgresql://sprint:sprint@localhost:5432/sprintapp
REDIS_URL=redis://localhost:6379
SESSION_TTL_SECONDS=28800
BCRYPT_COST=12
APP_ORIGIN=http://localhost:3000

# seed
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=ChangeMe123!

# Jira export settings
JIRA_DEFAULT_ISSUE_TYPE=Task
JIRA_STORY_POINTS_COLUMN=Story point estimate
```

Provide `docker-compose.yml` with `postgres:16` and `redis:7` (with named volumes) for local development.

---

## 9. Excel Import

Flow: upload `.xlsx` → **preview** with validation → user confirms → **commit**.

- Read the first worksheet. First row is the header.
- Expected headers (case-insensitive, trimmed): `Title`, `Description`, `Team`, `Assignee`, `ST`, `Priority`.
- Also provide a simple **column-mapping step** in the preview UI in case headers differ (dropdown per expected field).
- Matching rules:
  - `Team`: match by team name (case-insensitive). Unknown team → row error (do not auto-create).
  - `Assignee`: match by full name or email (case-insensitive). Empty is allowed. Unknown → row error.
  - `ST`: must be a number ≥ 0 or empty.
  - `Priority`: `low|medium|high` case-insensitive; empty → `medium`; anything else → row error.
  - `Title` is required.
- Preview shows valid rows and error rows separately with the reason. The user may commit only the valid rows (error rows are skipped, and the count is reported).
- The user chooses the target: a sprint or Backlog.
- Max file size 5 MB, max 2000 rows.
- Provide a downloadable **template .xlsx** with the expected headers.

---

## 10. Jira-Compatible CSV Export

Endpoint: `GET /api/export/jira?sprintId=<id>`. UTF-8 with BOM (so Excel opens it correctly), comma-separated, all fields quoted as needed, `Content-Disposition: attachment; filename="sprint-<name>-jira.csv"`.

Columns, in this order:

| CSV column | Source |
|---|---|
| `Summary` | `tasks.title` |
| `Issue Type` | `JIRA_DEFAULT_ISSUE_TYPE` env (default `Task`) |
| `Description` | `tasks.description` (empty string if null) |
| `Priority` | `low`→`Low`, `medium`→`Medium`, `high`→`High` |
| `Assignee` | assignee's `jira_username` (empty if unassigned) |
| `Components` | team name |
| `Sprint` | sprint name |
| `<JIRA_STORY_POINTS_COLUMN>` | `tasks.story_points` (header name from env) |

Rules:

- Export only tasks of the requested sprint. Backlog tasks are never exported.
- Before download, the UI shows an **export preview dialog** with warnings (do not block the export, just warn):
  - tasks with no assignee
  - tasks whose assignee has no `jira_username`
  - tasks with no story points
- Description newlines must be preserved inside quoted fields.
- The Jira project key is chosen by the scrum master in Jira's import wizard, so it is not a CSV column.

---

## 11. Out of Scope (do NOT build)

Approval workflow, task status columns, task history/audit log, capacity planning, Gantt/timeline, comments, notifications, Jira API sync, SSO, per-team permissions, multi-language UI, mobile layout.

---

## 12. Project Structure (suggested)

```
.
├── README.md
├── DECISIONS.md              # you write this: assumptions & deviations
├── docker-compose.yml
├── .env.example
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── middleware.ts         # cookie-exists check only
    ├── app/
    │   ├── login/
    │   ├── sprints/[id]/
    │   ├── backlog/
    │   ├── admin/{teams,users,sprints}/
    │   └── api/...
    ├── lib/
    │   ├── db.ts             # Prisma singleton
    │   ├── redis.ts          # ioredis singleton
    │   ├── session.ts        # Redis session logic
    │   ├── auth.ts           # requireUser / requireAdmin
    │   ├── validation/       # Zod schemas
    │   ├── import-excel.ts
    │   └── export-jira.ts
    └── components/
        ├── TaskTable.tsx
        ├── TaskFilters.tsx
        ├── TaskForm.tsx
        ├── MoveToSprintDialog.tsx
        ├── ImportDialog.tsx
        └── ExportDialog.tsx
```

---

## 13. Build Order

Work in this order and keep the app runnable after each step:

1. Project setup, Docker Compose (Postgres + Redis), Prisma schema, migration, seed.
2. Redis session auth: login, logout, `requireUser`, middleware, rate limiting.
3. Admin CRUD: teams, users, sprints.
4. Sprint view + Backlog view: task table, filters, summary, create/edit/delete/move.
5. Excel import (preview + commit + template).
6. Jira CSV export with preview warnings.
7. Polish: empty states, toasts, error handling, README for running the app.

---

## 14. Quality Requirements

- TypeScript `strict` mode; no `any` unless justified.
- All DB access through Prisma; no raw SQL string-building with user input.
- Every route handler: authenticate → authorize → validate (Zod) → act.
- Add unit tests for: Redis session functions, Excel row validation, Jira CSV generation (including newlines, quotes, unicode, empty values).
- Write a short **"Run it locally"** section in a separate `RUNNING.md` (`docker compose up -d`, `npm install`, `npx prisma migrate dev`, `npx prisma db seed`, `npm run dev`).

## 15. Definition of Done

- [ ] `docker compose up -d && npm run dev` starts a working app with seed data.
- [ ] Login works; session is visible in Redis as `sess:<id>` with a TTL; logout deletes it.
- [ ] Changing a user's role or password revokes their existing sessions.
- [ ] Sprint view and Backlog view work with all filters; ST totals are correct.
- [ ] Tasks can be moved Sprint → Backlog, Backlog → Sprint, and Sprint → Sprint (single and bulk).
- [ ] Excel import handles valid rows, invalid rows, and the column-mapping step.
- [ ] Jira CSV opens correctly in Excel and matches the column table in section 10.
- [ ] Non-admins cannot reach `/admin/*` or `/api/admin/*`.
- [ ] `password_hash` is never sent to the browser.
