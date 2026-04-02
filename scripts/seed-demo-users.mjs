#!/usr/bin/env node
/**
 * Seed demo users for the ERP system.
 * Run with: npm run seed:users (or node scripts/seed-demo-users.mjs)
 * Requires the backend running (default http://127.0.0.1:8080).
 * Uses an existing admin account (default admin@erp.com / password123 from cmd/seed).
 */

const API_BASE =
  process.env.API_URL || 'http://127.0.0.1:8080/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@erp.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const DEMO_PASSWORD = 'Demo123!';

const DEMO_USERS = [
  { name: 'Demo Admin', email: 'demo-admin@erp.com', role: 'ADMIN' },
  { name: 'Demo PM', email: 'demo-pm@erp.com', role: 'PROJECT_MANAGER' },
  { name: 'Demo Engineer', email: 'demo-engineer@erp.com', role: 'SITE_ENGINEER' },
  { name: 'Demo Accountant', email: 'demo-accountant@erp.com', role: 'ACCOUNTANT' },
  { name: 'Demo Store Officer', email: 'demo-store@erp.com', role: 'STORE_OFFICER' },
];

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success || !data.data?.token) {
    const msg =
      data.message ||
      res.statusText ||
      'Login failed — ensure an admin exists (e.g. run: go run cmd/seed/main.go)';
    throw new Error(msg);
  }
  return data.data.token;
}

async function seed() {
  console.log('Seeding demo users...');
  console.log('API:', API_BASE);
  let token;
  try {
    token = await login();
  } catch (e) {
    console.error('Admin login:', e.message);
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const user of DEMO_USERS) {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          password: DEMO_PASSWORD,
          role: user.role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        console.log(`  Created: ${user.name} (${user.email})`);
        created++;
      } else if (
        res.status === 409 ||
        (data.message && data.message.includes('already exists'))
      ) {
        console.log(`  Skipped (exists): ${user.email}`);
        skipped++;
      } else {
        console.error(`  Failed ${user.email}:`, data.message || res.statusText);
      }
    } catch (err) {
      console.error(`  Error ${user.email}:`, err.message);
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  if (created > 0) {
    console.log(`Demo password for new users: ${DEMO_PASSWORD}`);
  }
}

seed();
