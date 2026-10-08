# Sprint Planning App — Design Guide

Companion to `README.md`. The README says **what** to build; this file says **how it should look and behave**. If they conflict on functionality, README wins. If they conflict on visual or layout details, this file wins.

**Design goal:** a calm, dense, Excel-like internal tool. People use it for long planning sessions, so it must be fast to scan, easy on the eyes, and keyboard-friendly. No decoration for its own sake.

---

## 1. Pages Needed

**6 pages** plus a handful of dialogs. Nothing else.

| # | Page | Route | Who | Purpose |
|---|---|---|---|---|
| 1 | Login | `/login` | everyone | Sign in |
| 2 | Sprint view | `/sprints/[id]` | all users | Main screen: tasks of one sprint |
| 3 | Backlog | `/backlog` | all users | Tasks with no sprint |
| 4 | Admin: Teams | `/admin/teams` | admin | Manage teams |
| 5 | Admin: Users | `/admin/users` | admin | Manage users |
| 6 | Admin: Sprints | `/admin/sprints` | admin | Manage sprints |

`/` is not a page: it redirects to the current sprint (see README section 6).

Also needed, but not counted as pages: a simple **403 "Not allowed"** screen and a **404 "Not found"** screen.

### Dialogs (modals / side panels)

| Dialog | Opened from | Notes |
|---|---|---|
| Task form (create / edit) | Sprint view, Backlog | Fields: title, description, team, assignee, ST, priority, sprint |
| Move to sprint | Sprint view, Backlog | Pick a sprint, or "Backlog" |
| Import from Excel | Sprint view, Backlog | 3 steps: upload → map columns → preview & confirm |
| Export Jira CSV | Sprint view | Shows warnings, then Download button |
| Confirm delete | any delete action | Short and clear, names the item |
| User form (create / edit) | Admin: Users | Includes reset-password action |
| Simple name forms | Admin: Teams, Sprints | Inline row editing is also fine |

The Sprint view and the Backlog are **the same component** with a different data source. Build the table once and reuse it.

---

## 2. Global Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Sprint Planner   Sprints  Backlog  Admin ▾          Sara ▾   │  ← top bar (fixed, 56px)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   page content (max width 1400px, centered, 24px padding)    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- **Top bar only.** No sidebar: there are too few pages to justify one, and a top bar leaves the full width for the table.
- Left: app name (links to `/`). Then nav: **Sprints**, **Backlog**, **Admin** (Admin dropdown with Teams / Users / Sprints; hidden for non-admins).
- Right: user's full name with a menu containing **Sign out**.
- The active nav item is underlined and bold (do not rely on color alone).
- Login page has no top bar: a centered card on a plain background.

---

## 3. Page Designs

### 3.1 Login
- Centered card, ~380px wide: app name, email, password, **Sign in** button.
- Generic error under the form: "Invalid email or password". When rate-limited: "Too many attempts. Try again in a few minutes."
- Button shows a spinner and is disabled while submitting.

### 3.2 Sprint view (main screen)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Sprint 24 ▾]  Oct 5 – Oct 18        [Import from Excel] [Export Jira CSV]│
├──────────────────────────────────────────────────────────────────────────┤
│ 18 tasks · 74 ST     Front-end 21 · Back-end 30 · PC 12 · Security 11    │  ← summary bar
├──────────────────────────────────────────────────────────────────────────┤
│ 🔍 Search title…  [Team ▾] [Assignee ▾] [Priority ▾]  Clear   [+ New task]│  ← filter bar
├──────────────────────────────────────────────────────────────────────────┤
│ ☐ │ Title                  │ Team      │ Assignee    │ ST │ Priority │ ⋯ │
│ ☐ │ Build payment API      │ Back-end  │ Sara Ahmadi │ 8  │ ● High   │ ⋯ │
│ ☐ │ Login page redesign    │ Front-end │ Ali Karimi  │ 5  │ ● Medium │ ⋯ │
│   │  └ description text shown when the row is expanded                   │
├──────────────────────────────────────────────────────────────────────────┤
│ 2 selected   [Move to sprint…] [Move to Backlog] [Delete]                │  ← appears on selection
└──────────────────────────────────────────────────────────────────────────┘
```

Behavior:
- **Sprint dropdown** lists sprints newest first; the current sprint is marked "(current)". Changing it navigates to `/sprints/[id]`.
- **Summary bar** reflects the *current filters*. The **ST per team** part always shows the whole sprint (not filtered), so the head manager always sees the real team load.
- **Filters** are stored in the URL query string. "Clear" resets them.
- **Table columns:** checkbox, Title, Team, Assignee (full name), ST, Priority, row menu (⋯: Edit, Move to sprint, Move to Backlog, Delete). Click a row's chevron or title to expand the description. Click column headers to sort (arrow icon shows direction).
- **Bulk action bar** slides in at the bottom when 1+ rows are selected.
- **ST column** is right-aligned; numbers use tabular figures so they line up.
- Unassigned tasks show a muted "Unassigned" in the Assignee cell.
- **Empty state:** "No tasks in this sprint yet." with **+ New task** and **Import from Excel** buttons. If filters hide everything: "No tasks match your filters." with a **Clear filters** link.
- Quick-edit: double-click the ST, Priority, or Assignee cell to edit in place; Enter saves, Esc cancels. Everything else is edited in the task form dialog.

### 3.3 Backlog
- Same layout as the Sprint view, with these differences:
  - The header shows the title "Backlog" and the task count instead of the sprint dropdown and dates.
  - No **Export Jira CSV** button (backlog is never exported).
  - The primary bulk action is **Move to sprint…**.
- **Empty state:** "The backlog is empty. Tasks you don't schedule will be kept here."
- Optional (nice to have): a "ST per team" summary, same as the Sprint view.

### 3.4 Admin pages (Teams, Users, Sprints)
- A simple table with a **+ New** button above it and a row menu (Edit, Delete). Page title and a one-line description at the top.
- **Teams:** columns: Name, Users count, Tasks count. Deleting a team with tasks shows an error: "This team still has N tasks. Move or delete them first."
- **Users:** columns: Name, Email, Jira username, Team, Role, ⋯. Row menu adds **Reset password**. Show a small "No Jira username" warning icon when it's missing.
- **Sprints:** columns: Name, Start, End, Tasks count, Status chip (Past / Current / Upcoming, calculated from dates), ⋯. Deleting shows: "N tasks will be moved to the Backlog."
- Forms open in a centered modal with inline field errors.

---

## 4. Dialog Designs

### Task form
- Width ~520px. Fields in this order: **Title** (required), **Description** (multi-line, optional), **Team** (required), **Assignee** (optional; list is filtered to the selected team's members first, with an option to show everyone), **ST** (number, step 0.5), **Priority** (segmented control: Low / Medium / High, default Medium), **Sprint** (dropdown including "Backlog").
- Buttons: **Save** (primary), **Cancel**. Ctrl/Cmd+Enter saves. First field is focused on open.

### Import from Excel (3 steps, with a step indicator)
1. **Upload:** drag-and-drop area + "Download template" link. Choose the target: a sprint or Backlog.
2. **Map columns:** one row per expected field (Title, Description, Team, Assignee, ST, Priority) with a dropdown of the file's headers. Auto-filled when names match.
3. **Preview:** two tabs, **Valid (N)** and **Errors (N)**. Error rows show the row number and the reason. Button: **Import N tasks**. A note says error rows will be skipped.
- After import: toast "Imported 42 tasks. 3 rows skipped."

### Export Jira CSV
- Shows: sprint name, number of tasks, total ST.
- Warnings list (yellow), each with a count and an expandable list of the affected tasks: no assignee, assignee without Jira username, no ST.
- Buttons: **Download CSV** (primary, never blocked by warnings), **Cancel**.

### Confirm delete
- Title: "Delete task?" / "Delete 5 tasks?". Body names the item (or the count). Buttons: **Delete** (red), **Cancel**. Cancel is focused by default.

---

## 5. Visual Style

Use Tailwind CSS. Keep a small token set; do not invent extra colors.

### Color
| Token | Light mode | Use |
|---|---|---|
| Background | `#F8FAFC` | page |
| Surface | `#FFFFFF` | cards, table, dialogs |
| Border | `#E2E8F0` | dividers, inputs |
| Text | `#0F172A` | main text |
| Muted text | `#64748B` | secondary text, placeholders |
| Primary | `#2563EB` | main buttons, links, focus ring |
| Danger | `#DC2626` | delete, errors |
| Warning | `#D97706` | export warnings |
| Success | `#16A34A` | success toasts |

- Support **light mode** first. Dark mode is optional; if added, follow the system setting.
- Text and background contrast must meet WCAG AA (4.5:1).

### Priority badges
Always show a **label and a dot**, never color alone.

| Priority | Style |
|---|---|
| Low | gray background, gray text, `● Low` |
| Medium | amber background, dark amber text, `● Medium` |
| High | red background, dark red text, `● High` |

### Typography
- Font: system UI stack (`Inter` if the agent wants to add a web font; otherwise system fonts). Include a `font-feature-settings: "tnum"` for the ST column.
- Sizes: page title 20px/semibold, table text 14px, table header 12px/uppercase/muted, small text 12px.

### Density & spacing
- **Compact by default:** table row height 40px, cell padding 8px 12px. Planning sessions show many rows; avoid big whitespace.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 px.
- Corners: 6px on inputs, buttons and badges; 10px on cards and dialogs. Light shadow only on dialogs and dropdowns.
- Sticky table header so column names stay visible while scrolling. Zebra striping is **off**; use a subtle hover highlight and a light blue tint for selected rows.

### Icons
Use one icon set (e.g., `lucide-react`). Icon-only buttons need an `aria-label` and a tooltip.

---

## 6. States & Feedback

| Situation | Behavior |
|---|---|
| Loading a table | Skeleton rows (6–8), not a full-page spinner |
| Saving | Button spinner; for inline edits, update optimistically and roll back with an error toast on failure |
| Success | Toast, bottom-right, auto-dismiss after 4s |
| Error | Toast with the reason; form errors shown inline under the field |
| Session expired | Redirect to `/login` with a message "Your session expired. Please sign in again." and return to the previous page after login |
| Not allowed | 403 screen with a link back to the Sprint view |
| Network failure | Toast "Can't reach the server. Try again." with a **Retry** action |

---

## 7. Accessibility & Keyboard

- Everything reachable and usable with the keyboard; visible focus ring (2px primary) on all interactive elements.
- Dialogs trap focus, close with Esc, and return focus to the button that opened them.
- Table checkboxes have labels (`aria-label="Select task: <title>"`); sort buttons announce direction.
- Do not rely on color alone for meaning (priority, warnings, errors).
- Suggested shortcuts (optional): `N` new task, `/` focus search, `Esc` clear selection.

---

## 8. Responsive Behavior

- **Target:** laptop screens, 1280px and wider. Minimum supported width: 1024px.
- Below 1280px, hide the Description expand arrow's extra text and let the table scroll horizontally inside its container; the Title column keeps priority for width.
- Mobile is not a priority and does not need a dedicated layout, but nothing should be broken (no overlapping elements).

---

## 9. Component List

Build these shared components first and reuse them:

| Component | Used by |
|---|---|
| `AppShell` (top bar + content container) | all pages except Login |
| `TaskTable` (columns, sorting, selection, expand row) | Sprint view, Backlog |
| `TaskFilters` (search + selects, URL-synced) | Sprint view, Backlog |
| `SummaryBar` (counts, total ST, ST per team) | Sprint view, Backlog |
| `PriorityBadge` | tables, forms |
| `BulkActionBar` | Sprint view, Backlog |
| `TaskForm` dialog | Sprint view, Backlog |
| `MoveToSprintDialog` | Sprint view, Backlog |
| `ImportDialog` (3 steps) | Sprint view, Backlog |
| `ExportDialog` | Sprint view |
| `ConfirmDialog` | all delete actions |
| `DataTable` (simple admin table) | Admin pages |
| `Toast` | everywhere |
| `EmptyState` | all tables |

---

## 10. Out of Scope for Design

Dark-mode polish, mobile layout, drag-and-drop between sprints, charts and dashboards, Gantt/timeline views, onboarding tours, custom themes. Do not build these.
