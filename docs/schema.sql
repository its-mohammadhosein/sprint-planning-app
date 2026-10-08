-- Sprint Planning App: PostgreSQL schema
-- Tables: teams, users, sprints, tasks
-- A task with sprint_id = NULL is in the Backlog.

BEGIN;

-- ---------- Priority type ----------
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- ---------- Teams ----------
CREATE TABLE teams (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE          -- Front-end, Back-end, PC, Security...
);

-- ---------- Users ----------
CREATE TABLE users (
    id             SERIAL PRIMARY KEY,
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    jira_username  TEXT UNIQUE,               -- needed so the Jira import can match the assignee
    team_id        INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_team ON users(team_id);

-- ---------- Sprints ----------
CREATE TABLE sprints (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,         -- e.g. "Sprint 24"
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    CONSTRAINT sprint_dates_valid CHECK (end_date >= start_date)
);

-- ---------- Tasks ----------
CREATE TABLE tasks (
    id            SERIAL PRIMARY KEY,
    title         TEXT NOT NULL,              -- Jira "Summary"
    description   TEXT,                       -- Jira "Description"
    story_points  NUMERIC(4,1) CHECK (story_points >= 0),   -- ST
    priority      task_priority NOT NULL DEFAULT 'medium',
    assignee_id   INTEGER REFERENCES users(id)   ON DELETE SET NULL,
    team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    sprint_id     INTEGER REFERENCES sprints(id) ON DELETE SET NULL,  -- NULL = Backlog
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_sprint   ON tasks(sprint_id);
CREATE INDEX idx_tasks_team     ON tasks(team_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Keep updated_at fresh on every edit
CREATE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Views ----------

-- Main table the app shows: names instead of ids, "Backlog" when no sprint
CREATE VIEW task_table AS
SELECT
    t.id,
    t.title,
    t.description,
    t.story_points,
    t.priority,
    u.first_name || ' ' || u.last_name AS assignee_name,
    tm.name                            AS team_name,
    COALESCE(s.name, 'Backlog')        AS sprint_name,
    t.sprint_id,
    t.team_id,
    t.assignee_id
FROM tasks t
JOIN teams tm       ON tm.id = t.team_id
LEFT JOIN users u   ON u.id  = t.assignee_id
LEFT JOIN sprints s ON s.id  = t.sprint_id;

-- Total story points per team per sprint (Backlog shows as NULL sprint)
CREATE VIEW sprint_load AS
SELECT
    s.name              AS sprint_name,
    tm.name             AS team_name,
    COUNT(*)            AS task_count,
    COALESCE(SUM(t.story_points), 0) AS total_story_points
FROM tasks t
JOIN teams tm       ON tm.id = t.team_id
LEFT JOIN sprints s ON s.id  = t.sprint_id
GROUP BY s.name, tm.name;

COMMIT;
