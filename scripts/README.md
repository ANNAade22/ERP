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

Seeds projects, milestones, and expenses for the finance module demo. Requires at least one user (run `seed-demo-users` or create a user first).

```bash
go run cmd/seed/main.go
```

Uses `.env` for DB connection (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).

Creates:
- 3 projects with budgets ($100k, $150k, $80k)
- Milestones with completion progress
- 10 expenses (mix of APPROVED, PENDING) across categories
- At least one project over budget for Overrun Alerts

## Demo checklist

1. Start backend and frontend
2. Run `npm run seed:users` (backend must be running)
3. Run `go run cmd/seed/main.go` (seeds finance demo data)
4. Log in as `demo-admin@erp.com` / `Demo123!`
5. Navigate to Finance > Finance Overview, Budget Tracker, Cash Flow, Profitability, Overrun Alerts
