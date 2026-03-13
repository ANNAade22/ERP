# Scripts

## seed-demo-users.mjs

Creates sample users for demo purposes. Run after starting the backend.

```bash
npm run seed:users
```

Or with a custom API URL:

```bash
API_URL=http://localhost:8080/api/v1 node scripts/seed-demo-users.mjs
```

Creates 5 users (Admin, Project Manager, Site Engineer, Accountant, Store Officer) with password `Demo123!`.

## Finance demo seed (Go)

Seeds **vendors**, projects, milestones, and expenses for the demo. Requires at least one user (run `seed-demo-users` or create a user first).

```bash
go run cmd/seed/main.go
```

Or: `npm run seed:finance`

Uses `.env` for DB connection (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).

Creates:
- **5 vendors** (KSO/Contractor/Supplier mix; ACTIVE, PREFERRED, INACTIVE) for the Vendors / Manage Contractors page
- 3 projects with budgets ($100k, $150k, $80k)
- Milestones with completion progress
- **Materials** (per project: Cement, Steel Rebar, Sand, etc.) and **stock movements** for Inventory / Stock Levels
- **Purchase requests** (PENDING, APPROVED, ORDERED, RECEIVED) linked to vendors for Material Requests and vendor stats
- 10 expenses (mix of APPROVED, PENDING) across categories; some linked to vendors for Spend by vendor
- **Equipment** (dump truck, excavator, crane, road roller), **maintenance tasks**, and **schedules** for the Equipment page
- At least one project over budget for Overrun Alerts

## Demo checklist

1. Start backend and frontend (`npm run backend`, `npm run frontend`)
2. Run `npm run seed:users` (backend must be running)
3. Run `go run cmd/seed/main.go` (or `npm run seed:finance`)
4. Log in as `demo-admin@erp.com` / `Demo123!`
5. **Suggested demo flow:**
   - **Dashboard** — Overview, project summaries, vendors summary, low stock, procurement
   - **Vendors** (Procurement → Manage Contractors) — 5 seeded vendors; add/edit/delete, search
   - **Projects** — List, create/edit, open a project → see “Vendors on this project” (from expenses)
   - **Finance** — Budget Tracker (vendor-linked expenses, “Spend by vendor”), Cash Flow, Profitability, Overrun Alerts
   - **Inventory** — Stock Levels (materials + stock), Material Requests (PRs with vendors)
   - **Equipment** — Equipment list, dashboard (upcoming maintenance), schedules
