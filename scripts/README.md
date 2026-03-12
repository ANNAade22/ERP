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
