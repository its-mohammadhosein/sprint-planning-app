# Task Plan — Sprint Planning App

Source: [docs/README.md](docs/README.md) (section 13, "Build Order") and section 15 ("Definition of Done").

Keep the app runnable after each step.

## Steps

1. **Project setup & data layer**
   - Init Next.js (App Router) + TypeScript project.
   - Add `docker-compose.yml` (Postgres 16 + Redis 7, named volumes).
   - Write Prisma schema matching [docs/schema.sql](docs/schema.sql) (teams, users, sprints, tasks, enums, indexes, `updated_at` trigger behavior via `@updatedAt`).
   - Run initial migration (`npx prisma migrate dev`).
   - Write `prisma/seed.ts` (4 teams, 1 admin, ~8 users, 3 sprints, ~30 tasks incl. Backlog).
   - Add `.env.example` and `DECISIONS.md`.

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
