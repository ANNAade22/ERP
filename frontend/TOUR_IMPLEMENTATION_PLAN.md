# Guided Tour (Take Tour) – Implementation Plan

## Goal
Add a **Take tour** button and guided tour on every main page so users get a smooth, consistent onboarding experience. Start with **Projects**, then roll out to other pages using the same pattern.

## Current Reference
- **Equipment** page already has:
  - `driver.js` for the tour
  - A "Take tour" button in the page header
  - Stable `id` attributes on sections (e.g. `#equipment-page-header`, `#equipment-stat-cards`, `#equipment-add-btn`)
  - A `startTour()` function with steps: header → stat cards → add button → fleet → maintenance → scheduled table
  - Optional: `localStorage` key `equipment-tour-done` on completion

## Pattern to Reuse on Every Page

1. **Imports**
   - `import { driver } from 'driver.js'`
   - `import 'driver.js/dist/driver.css'`

2. **Stable IDs**
   - Add unique, kebab-case IDs to: page header, primary action button(s), filters (if any), main content area, and any key subsections (e.g. tables, cards grid).

3. **Tour steps**
   - First step: page header (intro + “Use Take tour anytime to see these tips again”).
   - Then: main actions (e.g. “New Project”, “Gantt & Milestones”).
   - Then: filters/search if the page has them.
   - Then: main content (cards, table, or list).
   - Last: any secondary section (e.g. scheduled table, reports).

4. **UI**
   - Add a **Take tour** button in the page header (same style as Equipment: `btn btn-secondary`), next to other header actions.

5. **Optional (later)**
   - Per-page `localStorage` key (e.g. `projects-tour-done`) to avoid re-running automatically.
   - First-time hint: e.g. “New here? Take a quick tour” only when the key is not set.

## Page-by-Page Rollout

| Page           | Priority | Key elements to highlight |
|----------------|----------|---------------------------|
| **Projects**   | 1 (first)| Header, Gantt link, New Project, filters, project cards grid |
| Dashboard      | 2        | Header, stat cards, main widgets / quick links |
| Equipment      | Done     | Already implemented |
| Attendance     | 3        | Header, filters, table/calendar |
| Registry       | 4        | Header, search/filters, list/table |
| Vendors/Contractors | 5  | Header, add button, table/list |
| Inventory (Stock, Material Requests) | 6 | Header, actions, tables |
| Finance (Budget, Cash Flow, Overrun, Profitability) | 7 | Header, filters, main content |
| Settings       | 8        | Header, sections/tabs |

## Projects Page – Concrete Steps (This PR)

1. Add `driver.js` import and CSS (same as Equipment).
2. Add IDs:
   - `projects-page-header` – wrapper of title + actions
   - `projects-gantt-link` – Gantt & Milestones link
   - `projects-add-btn` – “+ New Project” button
   - `projects-filters` – filter row (search, status, category, sort)
   - `projects-cards-grid` – grid of project cards (or empty state container)
3. Implement `startTour()` with steps in this order:
   - **Step 1:** `#projects-page-header` – “Projects – Manage construction projects and track progress. Use Take tour anytime to see these tips again.”
   - **Step 2:** `#projects-gantt-link` – “Gantt & Milestones – View and manage project timelines and milestones.”
   - **Step 3:** `#projects-add-btn` – “New Project – Create a project with name, location, category, status, budget, timeline, and team.”
   - **Step 4:** `#projects-filters` – “Search and filters – Search by name or location; filter by status and category; sort by name, budget, or date.” (Show only when filters exist, or use a wrapper that’s always present.)
   - **Step 5:** `#projects-cards-grid` – “Project cards – Each card shows status, budget usage, milestones, and quick links to Gantt and project details.”
4. Add **Take tour** button in the header next to “Gantt & Milestones” and “+ New Project”.
5. Ensure the filters div has an ID even when there are no projects (e.g. render an empty div with `id="projects-filters"` when `!loading` so the tour step always has a target, or make the step conditional).

## UX Notes

- **Consistent placement:** “Take tour” in the top-right area of each page, same style.
- **Short copy:** One sentence per step; avoid long paragraphs.
- **Progress:** Use `showProgress: true` in driver config so users see step N of M.
- **Skip/close:** driver.js provides “Next”, “Previous”, “Close”; no extra UI needed.
- **Escape:** Mention in the final step or first step that Escape closes modals (like on Equipment).

## Files to Touch (Projects)

- `frontend/src/pages/Projects.tsx`: imports, IDs, `startTour()`, “Take tour” button.

## After Projects

- Apply the same pattern to Dashboard, Attendance, Registry, etc., reusing this plan and adjusting step content per page.

---

## Demo checklist (quick smoke test)

Before the demo, quickly verify:

1. **Dashboard** — Log in, see “New here? Take a tour” if first time; click “Take tour” and run through all stat cards + overview step. Confirm “Click Close or press Escape to skip” in first step.
2. **Projects** — “Take tour” runs; steps cover header, Gantt link, New Project, filters, project cards.
3. **Gantt & Milestones** — Tour covers header, Project Management link, project select, New Milestone, stat cards, timeline, table, site photos.
4. **Equipment** — Tour covers header, Utilization Report, Add Equipment, stat cards, fleet, maintenance, scheduled table.
5. **Inventory (Stock Levels)** — Tour covers header, Create Order, Add Material, stat cards, materials grid, recent orders.
6. **Material Requests** — Tour covers header, Create Request, stat cards, filters, table.
7. **Budget vs Actual Tracker** — Tour covers header, Export, Add Budget, Add Expense, stat cards, tabs, project cards.
8. **Attendance** — Tour covers header, stat cards, attendance-by-site card.
9. **User Registry** — Tour covers header, Add user, filters, users table.
10. **Vendors** — Tour covers header, Add Vendor, vendor cards.
11. **Cash Flow / Overrun Alerts** — Short “Take tour” with header + coming-soon content.
12. **Profitability** — Tour covers header, Export, stat cards, tabs, project breakdown.
13. **Settings** — Tour covers header, Profile, Company, Security.

No red errors in the browser console when loading each page and starting the tour.
