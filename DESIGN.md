# Construction ERP — Design System Guide

Use this document to keep the app visually and structurally consistent. All new pages and components should follow these patterns.

---

## 1. Overview

- **Product:** Construction ERP Admin Dashboard  
- **Style:** Clean, professional, data-dense but readable  
- **Tech:** CSS custom properties in `frontend/src/index.css` — **do not introduce new color/spacing values**; use the variables below.

---

## 2. Colors

Use **CSS variables** only. No hardcoded hex/rgb in components.

### Sidebar
| Variable | Use |
|----------|-----|
| `--sidebar-bg` | Sidebar background |
| `--sidebar-bg-hover` | Sidebar item hover/active |
| `--sidebar-text` | Sidebar default text |
| `--sidebar-text-active` | Active item text |
| `--sidebar-width` | Sidebar width (e.g. 240px) |
| `--sidebar-accent` | Active indicator bar |

### Primary
| Variable | Use |
|----------|-----|
| `--primary` | Primary buttons, links, focus |
| `--primary-hover` | Primary button hover |
| `--primary-light` | Light primary backgrounds (e.g. icons) |

### Status
| Variable | Use |
|----------|-----|
| `--success` / `--success-bg` | Success states, positive variance |
| `--warning` / `--warning-bg` | Warnings, pending |
| `--danger` / `--danger-bg` | Errors, over budget, delete |
| `--info` / `--info-bg` | Informational, in progress |
| `--orange` / `--orange-bg` | Optional accent |
| `--purple` / `--purple-bg` | Categories, tags |

### Neutrals
| Variable | Use |
|----------|-----|
| `--bg` | Page background |
| `--surface` | Cards, inputs, modals |
| `--border` | Borders (default) |
| `--border-light` | Subtle dividers |
| `--text-primary` | Headings, main text |
| `--text-secondary` | Descriptions, labels |
| `--text-muted` | Hints, metadata |

---

## 3. Typography

- **Font:** `var(--font-family)` (Inter, system fallbacks)
- **Sizes:** Use variables; avoid arbitrary `font-size` values.

| Variable | Typical use |
|----------|-------------|
| `--font-xs` | Badges, captions, table meta |
| `--font-sm` | Labels, secondary text, buttons |
| `--font-base` | Body text (default) |
| `--font-md` | Card titles, emphasis |
| `--font-lg` | Section titles |
| `--font-xl` | Login title |
| `--font-2xl` | Page title (h1) |

---

## 4. Spacing

Use **spacing variables** for padding/margin/gap. Prefer multiples of the scale.

| Variable | Value |
|----------|--------|
| `--space-1` to `--space-12` | 0.25rem → 3rem |

**Common usage:**
- Page padding: `var(--space-8)`
- Between sections: `var(--space-6)` or `var(--space-8)`
- Card padding: `var(--space-5)` or `var(--space-6)`
- Form groups: `var(--space-4)` or `var(--space-5)` between rows

---

## 5. Radius & Shadows

| Variable | Use |
|----------|-----|
| `--radius-sm` | Buttons, inputs, small elements |
| `--radius-md` | Buttons, inputs (default) |
| `--radius-lg` | Cards, modals |
| `--radius-xl` | Login card, large containers |
| `--radius-full` | Pills, progress bars |
| `--shadow-sm` / `--shadow-md` / `--shadow-lg` | Elevation (cards, modals) |

---

## 6. Layout Structure

### App layout (already in place)
- **Sidebar:** Fixed left, `--sidebar-width`, dark theme (`--sidebar-bg`).
- **Main area:** `margin-left: var(--sidebar-width)`; contains Header + main content.
- **Main content:** Scrollable area with `padding: var(--space-8)`.

### Page structure (every page)
1. **Page header** (`.page-header`)
   - Left: title (h1) + short description (p).
   - Right: primary actions (e.g. “+ New Project”) in `.page-header-actions`.
2. **Stat cards** (optional): `.stat-cards` with `.stat-card` children.
3. **Content:** `.content-card` blocks or `.cards-grid` for card-based layouts.

---

## 7. Components (CSS classes to use)

### Buttons
- **Primary:** `btn btn-primary` — main actions (Create, Save, Submit).
- **Secondary:** `btn btn-secondary` — Cancel, Export, secondary actions.
- **Danger:** `btn btn-danger` — Delete, destructive actions.
- **Icon only:** `btn-icon`; add `danger` for delete-style icon.

Button height is standardized (e.g. 38px). Use Lucide icons inside with consistent size (e.g. 16px).

### Badges (status, category)
- Class: `badge badge-{success|warning|danger|info|neutral|orange|purple}`.
- Use for: status (Active, Pending, Completed), category (Residential, Commercial), urgency.

### Cards
- **Generic container:** `content-card` — white surface, border, rounded, padding.
- **Stat card:** `stat-card` inside `stat-cards` (grid).
- **Entity cards:** `project-card`, `vendor-card`, `material-card`, `equipment-card` — use the one that matches the entity; keep same structure (header, meta, progress/footer) for consistency.

### Grids
- **Cards grid:** `cards-grid cols-2` or `cards-grid cols-3` for 2- or 3-column card layouts.

### Forms
- **Group:** `form-group` with `form-label` + `form-input` (or `select` / `textarea`).
- **Row (two columns):** `form-row` wrapping two `form-group`s.
- **Inputs:** Use `form-input`; height ~42px for single-line, textarea for multi-line.

### Modals
- **Overlay:** `modal-overlay` (backdrop + blur).
- **Container:** `modal` with `modal-header`, `modal-body`, `modal-footer`.
- **Title/subtitle:** `modal-title`, `modal-subtitle`.
- **Close:** Button with `modal-close` class.
- **Footer actions:** Right-aligned; primary action on the right.

### Tables
- Wrapper: `data-table-wrapper`.
- Table: `data-table`; use `th` for headers, `td` for cells; optional `.actions` cell for buttons.

### Progress
- **Bar:** `progress-bar` with inner `progress-bar-fill`.
- **Semantic:** Add `.success`, `.warning`, or `.danger` to `progress-bar-fill` when showing status (e.g. budget used).

### Tabs
- Container: `tabs`.
- Tab: `tab`; active: `tab active`.

### Filter row (lists/tables)
- Container: `filter-row`.
- Input: `filter-input` (search).
- Select: `filter-select` (filters).

---

## 8. Page-specific patterns

- **Dashboard:** Page header + `stat-cards` + `content-card` (e.g. “Projects Overview” with `active-project` rows).
- **List pages (e.g. Projects, Vendors):** Page header with “+ Add” primary button + `cards-grid` or `data-table` + filters if needed.
- **Detail / form in modal:** Same as list; open modal with `modal-overlay` + `modal`; form uses `form-group` / `form-row` and `modal-footer` for Cancel + Submit.
- **Login:** Centered `login-card` on `login-page` (gradient background); form with `form-group`, `form-label`, `form-input`, and full-width `btn btn-primary login-btn`.

---

## 9. Icons

- **Library:** Lucide React.
- **Sizes:** 14–20px depending on context (e.g. 18 in header search, 20 in stat cards, 14 in table/card meta).
- Prefer consistent icon for same action (e.g. Pencil = edit, Trash2 = delete).

---

## 10. Responsive breakpoints

Defined in `index.css`; use the same breakpoints for any new media queries:

- **1200px:** e.g. 3-col grid → 2-col.
- **768px:** Sidebar hidden by default (toggle); header search narrower; grids → 1 col; page header stacks; settings rows stack.
- **480px:** Stat cards 1 col; main content padding reduced.

New components should behave sensibly at these breakpoints (stack, hide, or simplify).

---

## 11. Naming and file conventions

- **CSS:** Use existing class names from this guide; add new ones in `index.css` and document them here if they become reusable.
- **Components:** Prefer functional names (e.g. `MilestoneList`, `ProjectCard`) and place under `frontend/src/components/` (or `pages/` for page-specific pieces).
- **Pages:** One main component per route; use the same layout (page header + content) and same design tokens.

---

## 12. Quick checklist for new pages

- [ ] Page has `.page-header` with title, description, and actions (if any).
- [ ] Uses `content-card` or appropriate card type for content.
- [ ] Buttons use `btn btn-primary` / `btn btn-secondary` / `btn-danger`.
- [ ] Status/category shown with `badge badge-*`.
- [ ] Colors/spacing from variables (no ad-hoc hex or spacing).
- [ ] Forms use `form-group`, `form-label`, `form-input`, `form-row`.
- [ ] Modals use `modal-overlay`, `modal`, `modal-header`, `modal-body`, `modal-footer`.
- [ ] Layout works at 768px and 480px (no horizontal scroll, readable text).

Keeping to this guide will keep the Construction ERP UI consistent and maintainable.
