# Construction ERP — Client Documentation

**Version:** 1.1  
**Last Updated:** 2026-03-14  
**Audience:** Clients, stakeholders, and delivery teams

This document explains what the Construction ERP system does, who it is for, how it works, and how to install and deploy it.

---

## Contents

- **1. Project Overview**
- **2. Key Features**
- **3. System Architecture**
- **4. Technologies Used**
- **5. User Roles**
- **6. Workflow / How the System Works**
- **7. Installation / Setup Guide (Local)**
- **8. Deployment Guide (Online Demo)**
- **9. API Documentation**
- **10. Security Considerations**
- **11. Future Improvements**

---

## 1. Project Overview

### What the System Does

**Construction ERP** is a web-based system for managing construction operations in one place. It supports:

- **Project planning and tracking** (projects, milestones, photos)
- **Workforce operations** (workers, daily attendance)
- **Procurement and inventory** (vendors, purchase requests, stock movements)
- **Finance** (expenses, budget tracking, invoices, payments, analytics)
- **Equipment management** (equipment, maintenance, scheduling)

### Purpose of the Project

- **Operational control**: unify project, cost, and site operations in one system
- **Real-time visibility**: dashboards and reporting endpoints for performance and risk
- **Process consistency**: structured workflows for approvals and updates
- **Access control**: role-based permissions to reduce errors and prevent unauthorized actions

### Who Will Use the System

| User Type | Typical Use |
|-----------|-------------|
| **Administrators** | Full system control; configure projects; manage users and permissions |
| **Project Managers** | Oversee delivery; approve requests and statuses; track milestones, budgets, and equipment |
| **Site Engineers** | Mark attendance; upload site photos; raise procurement requests; update progress |
| **Accountants** | Record and review expenses; track profitability and cash flow; manage invoices and payments |
| **Store Officers** | Manage vendors; maintain stock and materials; process material requests and receipts |

---

## 2. Key Features

- **Dashboard (single API)**: overview KPIs + summaries for projects, attendance, low stock, procurement, equipment, and vendors
- **Projects**: create/list/update projects, view project details, view vendors/workers/photos per project
- **Milestones & Gantt**: milestones per project + Gantt-style milestone view + milestone dashboard stats
- **Site Photos**: upload, list, download, and delete project photos
- **Attendance**: worker creation, daily attendance marking, checkout, reports by date/worker
- **Vendors**: vendor CRUD (used across procurement and finance)
- **Procurement**: purchase requests with status progression (e.g., Pending → Approved → Ordered → Received)
- **Inventory**: materials per project, stock in/out, movement history, low-stock alerts
- **Finance**:
  - expenses (create/list/status updates)
  - analytics endpoints (budget overview, cash flow, profitability, overrun alerts, vendor spend, trends)
  - invoices & payments (create invoice, record payment, download invoice)
- **Equipment**: equipment CRUD, maintenance tasks, scheduling, dashboard overview
- **User & Profile Management**: profile updates, password changes, admin user management, avatar upload/serve

---

## 3. System Architecture

The system uses a standard **frontend + API + database** structure:

```
┌───────────────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                            │
│ - SPA with role-protected routes                                   │
│ - Axios API client (supports Bearer token or cookie auth)           │
└───────────────────────────────────────────────────────────────────┘
                    │ HTTPS / JSON
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│ Backend (Go + Gin)                                                 │
│ - REST API under /api/v1                                           │
│ - JWT auth middleware + role middleware                            │
│ - Upload handling for avatars & project photos                      │
└───────────────────────────────────────────────────────────────────┘
                    │ SQL (GORM)
                    ▼
┌───────────────────────────────────────────────────────────────────┐
│ Database (PostgreSQL)                                              │
│ - Users, Projects, Milestones, Attendance, Expenses, Vendors,       │
│   Inventory, Procurement, Equipment, Invoices/Payments              │
└───────────────────────────────────────────────────────────────────┘
```

### Frontend

- **React SPA** with routes such as `/dashboard`, `/projects`, `/finance`, etc.
- **API Base URL** is configurable via `VITE_API_URL` (defaults to `http://localhost:8080/api/v1`).
- **Authentication modes**:
  - **Bearer token** (default): stores JWT in `localStorage` and sends `Authorization: Bearer ...`
  - **httpOnly cookie auth** (optional): enabled with `VITE_AUTH_USE_COOKIE=true` + backend `AUTH_USE_HTTPONLY_COOKIE=true`

### Backend

- **Go (Gin)** REST API grouped under `/api/v1`
- **Middleware**:
  - auth middleware validates JWT and extracts user claims
  - role middleware restricts sensitive endpoints by role
- **CORS** is controlled via `CORS_ORIGINS` (defaults to `http://localhost:3000,http://localhost:5173`)

### Database

- PostgreSQL database accessed via **GORM**
- On startup, the backend runs **auto-migration** to create/update tables
- Connection supports:
  - **`DB_URL`** (preferred for hosted DBs)
  - **`DATABASE_URL`**
  - or individual `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE`

---

## 4. Technologies Used

### Frontend

- **React 19 + TypeScript**: UI and type safety
- **Vite**: dev server and build tooling
- **React Router**: routing and route guards
- **Axios**: API calls (supports credentials for cookie auth)
- **driver.js**: guided tours / onboarding
- **lucide-react**: icons

### Backend

- **Go**: backend language
- **Gin**: HTTP API framework
- **GORM + Postgres driver**: ORM and migrations
- **JWT (HMAC)**: authentication tokens
- **bcrypt**: password hashing
- **gofpdf**: invoice PDF generation
- **godotenv**: load env vars in local dev

### Database

- **PostgreSQL**: relational database for all core records

---

## 5. User Roles

The system uses five roles, enforced both in the UI and in API middleware:

| Role | Core Responsibilities | Examples of Restricted Actions |
|------|------------------------|-------------------------------|
| **ADMIN** | System administration | Manage users/roles; create/delete projects |
| **PROJECT_MANAGER** | Delivery oversight | Approve/update statuses; manage milestones; manage equipment |
| **SITE_ENGINEER** | Site execution | Mark attendance; upload project photos; create purchase requests |
| **ACCOUNTANT** | Financial operations | Create expenses; manage invoices & payments; finance analytics |
| **STORE_OFFICER** | Store & procurement operations | Create/update vendors; manage materials & stock; update PR statuses |

---

## 6. Workflow / How the System Works

### Authentication and Access

1. User navigates to the web app.
2. If not authenticated, the app redirects to **Login**.
3. On login, backend returns a JWT token and (optionally) sets a secure **httpOnly cookie**.
4. Frontend uses either:
   - **Bearer auth**: stores token and sends it on every API request, or
   - **Cookie auth**: sends cookies automatically (`withCredentials`) and does not store token in `localStorage`.

### Typical Operational Flow (High Level)

- **Setup** (Admin): create projects, configure users/roles.
- **Execution** (Site Engineer): mark attendance, upload site photos, raise purchase requests.
- **Store/Procurement** (Store Officer + PM/Admin): manage vendors, process requests, stock-in materials upon receipt.
- **Finance** (Accountant + PM/Admin): record expenses, manage invoices/payments, monitor budgets and overruns.
- **Oversight** (PM/Admin): dashboard KPIs, project summaries, overrun alerts, milestone tracking.

---

## 7. Installation / Setup Guide (Local)

### Prerequisites

- **Node.js** (LTS recommended)
- **Go** (1.25+)
- **PostgreSQL**

### 7.1 Configure Environment Variables

Create a `.env` file in the repository root (recommended: copy from `.env.example`) and set at least:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=erp_db
DB_SSLMODE=disable

# Auth (required)
JWT_SECRET=your-secret-at-least-32-chars

# Server
PORT=8080

# Optional
UPLOAD_DIR=./uploads
CORS_ORIGINS=http://localhost:5173
AUTH_USE_HTTPONLY_COOKIE=false
```

### 7.2 Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 7.3 Run the System

```bash
# Runs backend (Go) + frontend (Vite) together
npm run dev
```

Or run separately:

```bash
npm run backend
npm run frontend
```

- **Backend**: `http://localhost:8080`
- **Frontend**: `http://localhost:5173`

### 7.4 Seed Demo Data (Optional)

```bash
# Backend must be running for user seeding
npm run seed:users

# Seeds finance/procurement/inventory demo data directly into DB
npm run seed:finance
```

**Demo credentials created by `npm run seed:users`:**

- `demo-admin@erp.com` / `Demo123!`
- `demo-pm@erp.com` / `Demo123!`
- `demo-engineer@erp.com` / `Demo123!`
- `demo-accountant@erp.com` / `Demo123!`
- `demo-store@erp.com` / `Demo123!`

---

## 8. Deployment Guide (Online Demo)

For a hosted demo, the project includes a practical deployment guide in `DEPLOY.md`.

**Recommended demo stack:**

- **Database**: Neon (PostgreSQL)
- **Backend**: Render (Go API)
- **Frontend**: Vercel (Vite / React)

**Key points to be aware of:**

- Backend expects **`JWT_SECRET`** to be set (required).
- For hosted Postgres, prefer **`DB_URL`** (full connection string) or `DATABASE_URL`.
- Configure backend **CORS** using `CORS_ORIGINS` (must match the frontend origin exactly).
- Set frontend `VITE_API_URL` to your backend URL including `/api/v1`.

---

## 9. API Documentation

**Base path:** `/api/v1`  
**Auth:** Most endpoints require authentication via either:

- **Bearer token**: `Authorization: Bearer <token>`, or
- **Cookie auth**: `AUTH_USE_HTTPONLY_COOKIE=true` (backend sets `auth_token` cookie on login)

### 9.1 Auth (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user (default role is Site Engineer) |
| POST | `/auth/login` | Login; returns JWT and optionally sets httpOnly cookie |
| POST | `/auth/logout` | Logout (clears cookie when cookie auth is enabled) |

**Login request (example):**

```json
{
  "email": "demo-admin@erp.com",
  "password": "Demo123!"
}
```

**Login response (example):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": { "token": "eyJhbGciOiJIUzI1NiIs..." }
}
```

### 9.2 User & Profile (Protected)

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/profile` | Current user profile |
| PATCH | `/profile` | Update name/phone/etc. |
| POST | `/profile/change-password` | Change password |
| GET | `/users` | Admin only |
| GET | `/users/assignable` | Admin + Project Manager (assignable list) |
| PATCH | `/users/:id/role` | Admin only |
| PATCH | `/users/:id/status` | Admin only |
| PATCH | `/users/:id/password` | Admin only |
| DELETE | `/users/:id` | Admin only |
| GET | `/users/:id/avatar` | Public image endpoint |
| POST | `/users/:id/avatar` | Admin only |
| DELETE | `/users/:id/avatar` | Admin only |

### 9.3 Dashboard (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Unified dashboard payload (overview + summaries + alerts) |

### 9.4 Projects & Milestones (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| GET | `/projects` | List projects |
| POST | `/projects` | Admin only |
| GET | `/projects/:id` | Project details |
| PUT | `/projects/:id` | Admin, Project Manager |
| DELETE | `/projects/:id` | Admin only |
| GET | `/projects/:id/milestones` | List milestones for project |
| POST | `/projects/:id/milestones` | Admin, Project Manager |
| GET | `/projects/:id/photos` | List photos |
| POST | `/projects/:id/photos` | Admin, Project Manager, Site Engineer |
| GET | `/projects/:id/photos/:photoId/file` | Download/serve photo |
| DELETE | `/projects/:id/photos/:photoId` | Admin, Project Manager, Site Engineer |
| GET | `/projects/:id/vendors` | Vendors associated with project |
| GET | `/projects/:id/workers` | Workers on project |
| GET | `/milestones/dashboard-stats` | Milestone dashboard stats |
| GET | `/milestones/:id` | Get milestone |
| PUT | `/milestones/:id` | Admin, Project Manager |
| DELETE | `/milestones/:id` | Admin, Project Manager |

### 9.5 Attendance (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| POST | `/workers` | Admin, Site Engineer |
| POST | `/attendance` | Admin, Site Engineer |
| PATCH | `/attendance/:id/checkout` | Admin, Site Engineer |
| GET | `/attendance` | Attendance by date |
| GET | `/attendance/worker/:workerId` | Attendance by worker |

### 9.6 Vendors (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| GET | `/vendors` | List vendors |
| GET | `/vendors/:id` | Vendor details |
| POST | `/vendors` | Admin, Store Officer |
| PUT | `/vendors/:id` | Admin, Store Officer |
| DELETE | `/vendors/:id` | Admin, Store Officer |

### 9.7 Procurement (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| POST | `/procurement/requests` | Admin, Site Engineer, Store Officer |
| GET | `/procurement/requests` | List by project |
| GET | `/procurement/requests/all` | List all |
| GET | `/procurement/requests/pending` | Admin, Project Manager |
| GET | `/procurement/requests/:id` | Request details |
| PATCH | `/procurement/requests/:id` | Admin, Site Engineer, Store Officer |
| PATCH | `/procurement/requests/:id/status` | Admin, Project Manager, Store Officer |
| GET | `/procurement/orders/recent` | Recent orders |

### 9.8 Inventory (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| POST | `/inventory/materials` | Admin, Store Officer |
| GET | `/inventory/materials` | List materials (by project) |
| GET | `/inventory/materials/:id` | Material details |
| DELETE | `/inventory/materials/:id` | Admin, Store Officer |
| POST | `/inventory/stock-in` | Admin, Store Officer |
| POST | `/inventory/stock-out` | Admin, Store Officer |
| GET | `/inventory/movements/:materialId` | Movement history |
| GET | `/inventory/low-stock` | Alerts |

### 9.9 Expenses (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| POST | `/expenses` | Admin, Accountant |
| GET | `/expenses` | List (supports filtering by project) |
| GET | `/expenses/summary` | Summary by project |
| GET | `/expenses/breakdown` | Breakdown by category |
| GET | `/expenses/:id` | Expense details |
| PATCH | `/expenses/:id/status` | Admin, Project Manager |
| DELETE | `/expenses/:id` | Admin only |

### 9.10 Invoices & Finance (Protected)

**Invoices (Admin, Project Manager, Accountant):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices` | List invoices |
| GET | `/invoices/for-payment` | Invoices due for payment |
| POST | `/invoices` | Create invoice |
| GET | `/invoices/:id` | Invoice details |
| GET | `/invoices/:id/download` | Download invoice PDF |
| POST | `/invoices/:id/payments` | Record payment |

**Finance analytics (Admin, Project Manager, Accountant):**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/finance/budget-overview` | Budget overview |
| GET | `/finance/profitability` | Profitability snapshot |
| GET | `/finance/expenses-by-month` | Expenses by month |
| GET | `/finance/overrun-alerts` | Over-budget projects |
| GET | `/finance/cash-flow` | Cash flow |
| GET | `/finance/profitability-trend` | Profitability trend |
| GET | `/finance/vendor-spend` | Spend by vendor |

### 9.11 Equipment (Protected)

| Method | Endpoint | Notes |
|--------|----------|------|
| GET | `/equipment` | List equipment |
| POST | `/equipment` | Admin, Project Manager |
| GET | `/equipment/:id` | Equipment details |
| PUT | `/equipment/:id` | Admin, Project Manager |
| DELETE | `/equipment/:id` | Admin, Project Manager |
| GET | `/equipment/dashboard` | Dashboard metrics |
| GET | `/equipment/scheduled` | Scheduled items |
| POST | `/equipment/scheduled` | Admin, Project Manager |
| PUT | `/equipment/scheduled/:id` | Admin, Project Manager |
| DELETE | `/equipment/scheduled/:id` | Admin, Project Manager |
| GET | `/equipment/:id/maintenance` | Maintenance tasks |
| POST | `/equipment/:id/maintenance` | Admin, Project Manager |
| PATCH | `/maintenance/:id` | Admin, Project Manager |
| DELETE | `/maintenance/:id` | Admin, Project Manager |

---

## 10. Security Considerations

### Authentication

- **JWT (HMAC)** is used for authentication.
- Backend enforces authentication on protected routes via middleware.
- **JWT_SECRET is required** (backend will not start without it).

### Password Protection

- Passwords are stored as **bcrypt hashes**.
- Password strength validation is enforced during registration.

### Access Control

- Sensitive actions are protected by **role-based authorization**.
- The frontend also hides/restricts pages based on role, but the **API is the source of truth**.

### Data Transport and CORS

- Use **HTTPS** in production.
- Configure **CORS** via `CORS_ORIGINS` to only allow trusted frontend origins.

### Token Storage Options

- **Default (Bearer token)**: token stored in `localStorage` and sent on each request.
- **More secure option (cookie auth)**:
  - backend: `AUTH_USE_HTTPONLY_COOKIE=true`
  - frontend: `VITE_AUTH_USE_COOKIE=true`
  - benefit: reduces risk of XSS stealing tokens from `localStorage`
  - note: cookie-based auth may require additional CSRF considerations depending on your deployment and browser settings

---

## 11. Future Improvements

- **Audit logs**: track who changed what and when
- **Notifications**: approvals, low stock, overdue maintenance, overrun alerts
- **Advanced reporting**: export to Excel/PDF, scheduled reports
- **Multi-company support (multi-tenancy)**: separate data per organization
- **Stronger auth**: refresh tokens and optional 2FA
- **File storage**: external object storage (e.g., S3) for photos/invoices for production-grade durability

