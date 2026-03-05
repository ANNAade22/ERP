# Project Pages Improvements

Workflow: Implement each task one-by-one. Verify after each phase before proceeding.

**Design consistency:** All UI work must follow [DESIGN.md](DESIGN.md) for colors, typography, spacing, component classes, and layout. Use CSS variables and existing classes only.

---

## Phase 0: Create planning document

- [x] Create this file at project root

---

## Phase 1: Search and filters (Projects list)

**File:** `frontend/src/pages/Projects.tsx`

- [x] Add search input (filter by name, location)
- [x] Add status filter dropdown (All, Planning, In Progress, On Hold, Completed, Cancelled)
- [x] Add category filter dropdown (All, Residential, Commercial, Industrial, Infrastructure)
- [x] Filter projects array client-side before mapping to cards

---

## Phase 2: Sort (Projects list)

**File:** `frontend/src/pages/Projects.tsx`

- [x] Add sort dropdown: Name (A–Z), Name (Z–A), Status, Budget (high/low), Start date
- [x] Sort filtered projects before rendering

---

## Phase 3: Quick links from project cards

**File:** `frontend/src/pages/Projects.tsx`

- [x] Add "View Gantt" link on each card → `/projects/gantt-milestones?project=<id>`
- [x] Add "Site photos" link → same route or project detail

---

## Phase 4: Project detail page and route

**Files:** `frontend/src/pages/projects/ProjectDetail.tsx`, `App.tsx`

- [x] Create ProjectDetail.tsx with project info, milestones, site photos, budget summary
- [x] Add route `/projects/:id` in App.tsx
- [x] Fetch project: `GET /api/v1/projects/:id`

---

## Phase 5: Last updated / created info on project cards

**File:** `frontend/src/pages/Projects.tsx`

- [x] Ensure backend returns `created_at` and `updated_at`
- [x] Display "Created: …" and "Updated: …" on each card
- [x] Add date-format helper (e.g. "2 days ago")

---

## Phase 6: Milestone progress on project cards

**File:** `frontend/src/pages/Projects.tsx`

- [x] Show "Milestones: X/Y completed" or progress bar on each card
- [x] Use backend milestone counts if available, or fetch per project

---

## Phase 7: Dashboard project cards link to project

**File:** `frontend/src/pages/Dashboard.tsx`

- [ ] Make project names clickable
- [ ] Link to `/projects/:id` or `/projects/gantt-milestones?project=:id`

---

## Phase 8: Gantt page – milestone filter and search

**File:** `frontend/src/pages/projects/GanttMilestones.tsx`

- [x] Add milestone status filter (All, Pending, In Progress, Completed, At Risk)
- [x] Add search input to filter milestones by title

---

## Phase 9: Site photos – filter by milestone

**File:** `frontend/src/pages/projects/GanttMilestones.tsx`

- [ ] Add dropdown to filter site photos by milestone
- [ ] Use `GET /projects/:id/photos?milestone_id=...`

---

## Phase 10: Gantt page – pre-select project from URL

**File:** `frontend/src/pages/projects/GanttMilestones.tsx`

- [x] Read `?project=<id>` from URL
- [x] Pre-select project on load when param present

---

## Phase 11: Empty states

**Files:** `Projects.tsx`, `GanttMilestones.tsx`

- [x] Projects: icon, message, "Create project" CTA
- [x] Gantt: "no project selected", "no milestones" states

---

## Phase 12: Loading skeletons

**Files:** Projects, GanttMilestones, Dashboard (optional)

- [x] Skeleton placeholders for cards, table, stats
- [x] Use DESIGN.md tokens for styling

---

## Phase 13: Toast notifications

- [x] Add toast library or custom component
- [x] Replace `alert()` with toasts for create/update/delete
