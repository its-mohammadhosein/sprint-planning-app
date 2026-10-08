# Task Plan — Sprint Planning App

Source: [docs/README.md](docs/README.md) (section 13, "Build Order") and section 15 ("Definition of Done").

Keep the app runnable after each step.

**Note:** the app lives in [main/](main/) (a Next.js app), with the root repo also holding [docs/](docs/). Paths below (`src/`, `prisma/`, etc.) are relative to `main/`.

## Steps

1. **Project setup & data layer**
   - [x] Init Next.js (App Router) + TypeScript project — scaffolded in `main/`.
   - [x] Install dependencies: `prisma`, `@prisma/client`, `ioredis`, `bcrypt`, `zod`, `@tanstack/react-table`, `exceljs`, `csv-stringify`.
   - [x] Git repo initialized at root, pushed to `origin/main`.
   - [x] Add `docker-compose.yml` (Postgres 16 + Redis 7, named volumes; Postgres host port `5433` to avoid a local conflict — see `main/DECISIONS.md`).
   - [x] Write Prisma schema matching [docs/schema.sql](docs/schema.sql) (teams, users, sprints, tasks, enums, indexes, `updated_at` via `@updatedAt`) — `main/prisma/schema.prisma`.
   - [x] Write `prisma/seed.ts` (4 teams, 1 admin, 8 sample users, 3 sprints, 30 sample tasks incl. Backlog) — needs `tsx` added as a dev dependency to run.
   - [x] Add `.env.example` and `DECISIONS.md`.
   - [x] Install dependencies via pnpm: `prisma`, `@prisma/client` (pinned to stable `6.19.3` — Prisma 7+ dropped the classic `url = env("DATABASE_URL")` schema pattern in favor of `prisma.config.ts` + driver adapters, see `main/DECISIONS.md`), `ioredis`, `bcrypt`, `@types/bcrypt`, `zod`, `@tanstack/react-table`, `exceljs`, `csv-stringify`, `tsx`.
   - [x] Run initial migration (`npx prisma migrate dev --name init`) against `docker compose up -d` Postgres/Redis.
   - [x] Run `npx prisma db seed` — verified in Postgres: 4 teams, 9 users, 3 sprints, 30 tasks (6 in Backlog).

   **Step 1 complete.** App is runnable: `docker compose up -d && pnpm dev` (run from `main/`).

   **Design reference setup (done, ahead of visual work in steps 2-7):**
   - [x] Extracted design tokens from `docs/design-reference/Sprint Planner.dc.html`'s `<style>` block + inline styles into `docs/design-reference/TOKENS.md` (colors incl. exact priority-badge hexes, typography, spacing, radii, sizing, exact copy/labels), cross-checked against the 31 reference screenshots.
   - [x] Configured Tailwind v4 (`main/src/app/globals.css` `@theme`) with those tokens — color tokens (`primary`, `danger`, `warning`, `success`, `priority-*`, etc.), radii (`sm`/`md`/`lg` = 4/6/10px), system font stack. Removed the default Geist font loading in `layout.tsx` to match the prototype's system-font look. Verified with `pnpm build`.
   - [ ] Steps 3-7 below should match the prototype's layout/look (screenshots in `docs/design-reference/`) per the prototype-wins-on-looks rule in `main/DECISIONS.md`.

2. **Auth: Redis-backed sessions**
   - `src/lib/redis.ts` (ioredis singleton), `src/lib/session.ts` (`createSession`, `getSession`, `destroySession`, `destroyAllUserSessions`).
   - `src/lib/auth.ts` with `requireUser()` / `requireAdmin()`.
   - `middleware.ts`: cheap cookie-exists check only.
   - `/login`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
   - Login rate limiting (5 failed/15min per email+IP), bcrypt cost 12, CSRF Origin check on mutations.

3. **Admin CRUD**
   - `/admin/teams`, `/admin/users`, `/admin/sprints` pages + `/api/admin/*` routes (admin-only).
   - User create/edit/reset-password/delete must revoke sessions on role/password change.
   - Block deleting a team with existing tasks.

4. **Sprint view + Backlog view**
   - Task table (TanStack Table): Title, Team, Assignee, ST, Priority; filters (team, assignee, priority, search) reflected in URL query string; sortable; summary bar (totals + ST per team).
   - Create/edit/delete task, move to Backlog, move to sprint (single + multi-select).
   - `/api/tasks`, `/api/tasks/:id`, `/api/tasks/move`, `/api/sprints`, `/api/teams`, `/api/users`.

5. **Excel import**
   - `src/lib/import-excel.ts` using `exceljs`.
   - Preview step (validation, column-mapping UI) + commit step.
   - `/api/import/preview`, `/api/import/commit`, downloadable template `.xlsx`.
   - Limits: 5 MB, 2000 rows max.

6. **Jira CSV export**
   - `src/lib/export-jira.ts` using `csv-stringify`.
   - `/api/export/jira?sprintId=<id>`, UTF-8 BOM, correct column order (section 10).
   - Export preview dialog with warnings (no assignee / no jira_username / no story points).

7. **Polish & tests**
   - Empty states, toast messages, error handling.
   - Unit tests: Redis session functions, Excel row validation, Jira CSV generation (newlines, quotes, unicode, empty values).
   - `RUNNING.md` with local run instructions.

## Definition of Done (verify at the end)

- [ ] `docker compose up -d && npm run dev` starts a working app with seed data.
- [ ] Login works; session visible in Redis as `sess:<id>` with TTL; logout deletes it.
- [ ] Changing a user's role or password revokes their existing sessions.
- [ ] Sprint view and Backlog view work with all filters; ST totals correct.
- [ ] Tasks move Sprint → Backlog, Backlog → Sprint, Sprint → Sprint (single & bulk).
- [ ] Excel import handles valid rows, invalid rows, column-mapping.
- [ ] Jira CSV opens correctly in Excel and matches section 10's columns.
- [ ] Non-admins cannot reach `/admin/*` or `/api/admin/*`.
- [ ] `password_hash` is never sent to the browser.
