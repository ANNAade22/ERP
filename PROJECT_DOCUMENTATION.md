# Construction ERP — Project Documentation

**Version:** 1.0  
**Last Updated:** March 2025  
**Audience:** Technical and Non-Technical Stakeholders

---

## 1. Project Overview

### What the System Does

**Construction ERP** is a full-stack web application designed for construction companies to manage their day-to-day operations in one place. The system brings together project management, workforce tracking, procurement, inventory, finance, and equipment maintenance into a single, role-based platform.

### Purpose of the Project

The project aims to:

- **Centralize operations** — Replace scattered spreadsheets and paper records with a unified digital system
- **Improve visibility** — Give managers real-time insights into budgets, attendance, inventory, and project progress
- **Streamline workflows** — From material requests to expense approval, the system supports structured processes
- **Support accountability** — Role-based access ensures users see only what they need and can take actions appropriate to their role

### Who Will Use the System

| User Type | Typical Use |
|-----------|-------------|
| **Administrators** | Full system control, user management, project setup |
| **Project Managers** | Oversee projects, approve expenses, track milestones and equipment |
| **Site Engineers** | Update project progress, mark attendance, request materials, upload photos |
| **Accountants** | Manage expenses, budgets, invoices, and payments |
| **Store Officers** | Manage vendors, inventory, stock movements, and material requests |

---

## 2. Key Features

### 2.1 Dashboard

- **Overview** — Total projects, active projects, total budget, spent amount, remaining budget, and utilization percentage
- **Project summaries** — Per-project budget, spent, remaining, and % used
- **Attendance summaries** — Workers per project, present/absent today, attendance rate
- **Low stock alerts** — Materials below minimum levels with project name
- **Procurement summary** — Pending requests, approved requests, total purchase value
- **Equipment summary** — Total, available, and under-maintenance equipment
- **Vendor summary** — Total, active, and preferred vendors

### 2.2 Project Management

- **Full CRUD** — Create, list, view, update, delete projects
- **Project details** — Name, description, location, status, budget, dates, category, timeline, team size, assigned engineer and manager
- **Milestones** — Define milestones per project with due dates, priority, assignee, progress, and status
- **Gantt view** — Visual timeline of milestones across projects
- **Project photos** — Upload and view site photos
- **Project vendors** — View vendors associated with each project via expenses

### 2.3 Attendance & Workers

- **Worker management** — Create and manage workers
- **Daily attendance** — Mark check-in and check-out per worker
- **Attendance reports** — View by date or by worker
- **Project-wise workers** — List workers assigned to each project

### 2.4 Finance

- **Budget Tracker** — Budget vs actual spending, add expenses by category
- **Cash Flow** — Inflows and outflows by month
- **Profitability** — Revenue, costs, margins
- **Overrun Alerts** — Projects exceeding budget
- **Invoices & Payments** — Create invoices, record payments, download PDF invoices
- **Vendor spend** — Breakdown of spending by vendor
- **Expense categories** — Labour, Material, Transport, Equipment, Overhead, Other

### 2.5 Vendors / Contractors

- **Vendor CRUD** — Create, list, view, update, delete vendors
- **Vendor types** — KSO, Contractor, Supplier
- **Vendor status** — Active, Preferred, Inactive
- Search and filter vendors

### 2.6 Inventory

- **Stock Levels** — Materials per project, current stock, minimum stock
- **Stock movements** — Stock-in and stock-out with history
- **Low stock alerts** — Alerts when materials fall below minimum
- **Material Requests** — Create purchase requests linked to projects and vendors

### 2.7 Procurement

- **Purchase requests** — Create, list, update material requests
- **Status workflow** — Pending → Approved → Ordered → Received
- **Pending requests** — List for approval (Project Manager / Admin)
- **Recent orders** — Quick view of recent procurement activity

### 2.8 Equipment

- **Equipment list** — Add, edit, delete equipment (e.g., dump truck, excavator, crane)
- **Maintenance** — Add and manage maintenance tasks per equipment
- **Schedules** — Create and manage equipment schedules
- **Equipment dashboard** — Upcoming maintenance and availability overview

### 2.9 User Management (Registry)

- **User list** — View all users (Admin only)
- **Role assignment** — Assign roles (Admin, Project Manager, Site Engineer, Accountant, Store Officer)
- **Status control** — Activate or deactivate users
- **Password reset** — Admin can reset user passwords
- **Avatar upload** — User profile photos

### 2.10 Settings

- **Profile** — Update name, phone
- **Change password** — Change own password

---

## 3. System Architecture

The system follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + Vite)                      │
│  React 19, TypeScript, React Router, Axios, Lucide Icons, driver.js  │
│  Runs on port 5173 (default)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP / JSON (REST API)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Go + Gin)                           │
│  JWT auth, CORS, role-based middleware, RESTful API                  │
│  Runs on port 8080 (default)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ GORM
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                        │
│  Users, Projects, Milestones, Workers, Attendance, Expenses,         │
│  Vendors, Materials, Purchase Requests, Stock Movements, Equipment   │
└─────────────────────────────────────────────────────────────────────┘
```

### Frontend

- **Single-page application (SPA)** — React with client-side routing
- **API client** — Axios with base URL `http://localhost:8080/api/v1` (configurable via `VITE_API_URL`)
- **Auth** — JWT stored in `localStorage`, sent as `Authorization: Bearer <token>` on every API request

### Backend

- **RESTful API** — All endpoints under `/api/v1`
- **Gin** — HTTP framework
- **GORM** — ORM for PostgreSQL; auto-migration for models
- **Layered design** — Handlers → Services → Repositories

### Database

- **PostgreSQL** — Primary data store
- **GORM** — Migrations run at startup; tables created automatically

---

## 4. Technologies Used

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 | UI components and state |
| | TypeScript | Type safety |
| | Vite 6 | Build tool and dev server |
| | React Router 7 | Client-side routing |
| | Axios | HTTP client |
| | Lucide React | Icons |
| | driver.js | In-app tours |
| | react-hot-toast | Notifications |
| | jwt-decode | Decode JWT for user info |
| **Backend** | Go 1.25 | Programming language |
| | Gin | Web framework |
| | GORM | ORM and migrations |
| | golang-jwt/jwt | JWT creation and validation |
| | gofpdf | PDF generation (invoices) |
| | godotenv | Environment variables |
| **Database** | PostgreSQL | Relational database |
| **DevOps** | concurrently | Run frontend + backend together |
| | Node.js | Scripts (seed users) |

---

## 5. User Roles

| Role | Key Permissions | Accessible Areas |
|------|-----------------|------------------|
| **ADMIN** | Full system access, user management, all create/update/delete | All modules, Registry, Settings |
| **PROJECT_MANAGER** | Manage projects, milestones, approve expenses, equipment | Projects, Gantt, Equipment, Finance, Vendors, Inventory, Attendance, Dashboard |
| **SITE_ENGINEER** | Create workers, mark attendance, upload photos, create PRs | Projects, Gantt, Attendance, Stock Levels, Material Requests, Dashboard |
| **ACCOUNTANT** | Manage expenses, budgets, invoices | Vendors, Finance (Budget, Cash Flow, Profitability, Overruns, Invoices), Dashboard |
| **STORE_OFFICER** | Manage vendors, materials, stock, purchase requests | Vendors, Stock Levels, Material Requests, Dashboard |

### Role-Based Route Protection

- **Protected routes** — Require authentication (JWT)
- **Role-protected routes** — Require specific roles; unauthorized users are redirected

---

## 6. Workflow / How the System Works

### 6.1 Login Flow

1. User opens the application
2. If not logged in → redirect to `/login`
3. User enters email and password
4. Backend validates credentials, returns JWT
5. Frontend stores JWT in `localStorage`, redirects to Dashboard
6. All subsequent API calls include `Authorization: Bearer <token>`

### 6.2 Typical User Journey (Project Manager)

1. **Login** → Dashboard shows overview
2. **Projects** → Open a project → View milestones, photos, vendors on project
3. **Gantt & Milestones** → Review and update milestone progress
4. **Procurement** → Approve pending material requests
5. **Finance** → Review budget tracker, overrun alerts, vendor spend
6. **Equipment** → Check maintenance schedule and equipment availability

### 6.3 Typical User Journey (Site Engineer)

1. **Login** → Dashboard shows low stock and procurement summary
2. **Attendance** → Mark workers present, record check-in/check-out
3. **Projects** → Open project → Add milestone progress, upload site photos
4. **Material Requests** → Create purchase request for materials
5. **Stock Levels** → Check current inventory

### 6.4 Procurement Workflow

1. **Site Engineer / Store Officer** creates a purchase request (PENDING)
2. **Project Manager / Admin** approves request (APPROVED)
3. **Store Officer** updates to ORDERED when order is placed
4. **Store Officer** updates to RECEIVED and performs stock-in

### 6.5 Expense Workflow

1. **Accountant** creates an expense linked to project and vendor
2. **Project Manager / Admin** approves or rejects (PENDING → APPROVED)

---

## 7. Installation / Setup Guide

### Prerequisites

- **Node.js** (v18+)
- **Go** (1.25+)
- **PostgreSQL** (12+)
- **npm** (comes with Node.js)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd erp-project
```

### Step 2: Database Setup

1. Create a PostgreSQL database (e.g. `erp`)
2. Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=erp
JWT_SECRET=your-secret-key-min-32-chars
PORT=8080
UPLOAD_DIR=./uploads
```

### Step 3: Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### Step 4: Run the Application

**Option A: Run backend and frontend together**

```bash
npm run dev
```

**Option B: Run separately**

```bash
# Terminal 1 — Backend
npm run backend

# Terminal 2 — Frontend
npm run frontend
```

- **Backend:** http://localhost:8080
- **Frontend:** http://localhost:5173

### Step 5: Seed Demo Data (Optional)

```bash
# 1. Seed demo users (backend must be running)
npm run seed:users

# 2. Seed vendors, projects, materials, expenses, equipment (requires Go)
go run cmd/seed/main.go
# or: npm run seed:finance
```

**Demo credentials (after seed:users):**

- Admin: `demo-admin@erp.com` / `Demo123!`
- Project Manager: `demo-pm@erp.com` / `Demo123!`
- Site Engineer: `demo-engineer@erp.com` / `Demo123!`
- Accountant: `demo-accountant@erp.com` / `Demo123!`
- Store Officer: `demo-store@erp.com` / `Demo123!`

### Optional: Frontend API URL

If the backend runs on a different host/port, set in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api/v1
```

---

## 8. API Documentation

**Base URL:** `http://localhost:8080/api/v1`

**Authentication:** All protected endpoints require:

```
Authorization: Bearer <jwt_token>
```

### 8.1 Authentication (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login; returns JWT |

**Login Request Example:**

```json
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "demo-admin@erp.com",
  "password": "Demo123!"
}
```

**Login Response Example:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 8.2 Projects

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/projects` | List all projects | Authenticated |
| GET | `/projects/:id` | Get project details | Authenticated |
| POST | `/projects` | Create project | Admin |
| PUT | `/projects/:id` | Update project | Admin, Project Manager |
| DELETE | `/projects/:id` | Delete project | Admin |
| GET | `/projects/:id/milestones` | List project milestones | Authenticated |
| POST | `/projects/:id/milestones` | Create milestone | Admin, Project Manager |
| GET | `/projects/:id/vendors` | Vendors on project | Authenticated |
| GET | `/projects/:id/workers` | Workers on project | Authenticated |
| GET | `/projects/:id/photos` | List photos | Authenticated |
| POST | `/projects/:id/photos` | Upload photo | Admin, Project Manager, Site Engineer |

### 8.3 Vendors

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/vendors` | List all vendors | Authenticated |
| GET | `/vendors/:id` | Get vendor | Authenticated |
| POST | `/vendors` | Create vendor | Admin, Store Officer |
| PUT | `/vendors/:id` | Update vendor | Admin, Store Officer |
| DELETE | `/vendors/:id` | Delete vendor | Admin, Store Officer |

### 8.4 Expenses

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/expenses` | List expenses (by project) | Authenticated |
| POST | `/expenses` | Create expense | Admin, Accountant |
| GET | `/expenses/:id` | Get expense | Authenticated |
| PATCH | `/expenses/:id/status` | Update status | Admin, Project Manager |
| DELETE | `/expenses/:id` | Delete expense | Admin |
| GET | `/expenses/summary` | Project expense summary | Authenticated |
| GET | `/expenses/breakdown` | Category breakdown | Authenticated |

### 8.5 Finance

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/finance/budget-overview` | Budget overview | Admin, Project Manager, Accountant |
| GET | `/finance/profitability` | Profitability data | Admin, Project Manager, Accountant |
| GET | `/finance/cash-flow` | Cash flow by month | Admin, Project Manager, Accountant |
| GET | `/finance/overrun-alerts` | Projects over budget | Admin, Project Manager, Accountant |
| GET | `/finance/vendor-spend` | Spend by vendor | Admin, Project Manager, Accountant |
| GET | `/finance/expenses-by-month` | Expenses by month | Admin, Project Manager, Accountant |

### 8.6 Inventory

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/inventory/materials` | List materials (by project) | Authenticated |
| POST | `/inventory/materials` | Create material | Admin, Store Officer |
| GET | `/inventory/materials/:id` | Get material | Authenticated |
| DELETE | `/inventory/materials/:id` | Delete material | Admin, Store Officer |
| POST | `/inventory/stock-in` | Stock in | Admin, Store Officer |
| POST | `/inventory/stock-out` | Stock out | Admin, Store Officer |
| GET | `/inventory/movements/:materialId` | Stock movements | Authenticated |
| GET | `/inventory/low-stock` | Low stock alerts | Authenticated |

### 8.7 Procurement

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/procurement/requests` | List by project | Authenticated |
| GET | `/procurement/requests/all` | List all | Authenticated |
| POST | `/procurement/requests` | Create purchase request | Admin, Site Engineer, Store Officer |
| PATCH | `/procurement/requests/:id` | Update PR | Admin, Site Engineer, Store Officer |
| PATCH | `/procurement/requests/:id/status` | Update status | Admin, Project Manager, Store Officer |
| GET | `/procurement/requests/pending` | Pending requests | Admin, Project Manager |

### 8.8 Equipment

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/equipment` | List equipment | Authenticated |
| POST | `/equipment` | Create equipment | Admin, Project Manager |
| GET | `/equipment/:id` | Get equipment | Authenticated |
| PUT | `/equipment/:id` | Update equipment | Admin, Project Manager |
| DELETE | `/equipment/:id` | Delete equipment | Admin, Project Manager |
| GET | `/equipment/dashboard` | Equipment dashboard | Authenticated |
| GET | `/equipment/:id/maintenance` | List maintenance | Authenticated |
| POST | `/equipment/:id/maintenance` | Create maintenance | Admin, Project Manager |

### 8.9 Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Unified dashboard data |

### 8.10 Users & Profile

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/profile` | Current user profile | Authenticated |
| PATCH | `/profile` | Update profile | Authenticated |
| POST | `/profile/change-password` | Change password | Authenticated |
| GET | `/users` | List users | Admin |
| PATCH | `/users/:id/role` | Update role | Admin |
| PATCH | `/users/:id/status` | Set active/inactive | Admin |

---

## 9. Security Considerations

### 9.1 Authentication

- **JWT** — Tokens are issued on login; contain user ID, email, role
- **Token lifetime** — Default 24 hours; stored in `localStorage` (client)
- **Token validation** — Middleware validates `Authorization: Bearer <token>` on every protected request
- **401 handling** — On invalid/expired token, frontend clears token and redirects to login

### 9.2 Data Protection

- **Passwords** — Hashed with bcrypt before storage; never returned in API responses
- **Environment variables** — Sensitive values (DB credentials, JWT secret) in `.env`, not in code
- **HTTPS** — Recommended in production for all traffic

### 9.3 Access Control

- **Role-based middleware** — Sensitive endpoints check `userRole` from JWT
- **Public routes** — Only `/auth/register` and `/auth/login` are public
- **Avatar images** — Served publicly via `/users/:id/avatar` (profile pictures)

### 9.4 CSRF

- **Bearer token in header** — Primary auth uses `Authorization: Bearer <token>`; cross-site request forgery (CSRF) risk is lower because the token is not sent automatically with same-origin requests from other sites.
- **Cookie-based auth** — When using optional httpOnly cookie auth (`AUTH_USE_HTTPONLY_COOKIE`), use `SameSite=Lax` (or `Strict`) on the cookie. CSRF protection (e.g. double-submit cookie or CSRF token) is recommended for any state-changing flows that rely on cookie-based sessions.

### 9.5 Configuration

- **Environment variables** — Copy `.env.example` to `.env` and set values. In production, **JWT_SECRET** is required (no default). Set **DB_SSLMODE=require** (or `verify-full`) for PostgreSQL. Set **CORS_ORIGINS** to your frontend origin(s). See `.env.example` for all options.

### 9.6 Recommendations for Production

1. Set `JWT_SECRET` (required; no default in production)
2. Enable HTTPS
3. Set `DB_SSLMODE=require` for PostgreSQL
4. Set `CORS_ORIGINS` to your frontend origin(s)
5. Rate limiting is applied on `/auth/login` and `/auth/register`
6. Consider httpOnly cookie auth (`AUTH_USE_HTTPONLY_COOKIE=true`) to reduce XSS token theft risk
7. Consider refresh tokens for longer sessions

---

## 10. Future Improvements

| Area | Possible Enhancement |
|------|----------------------|
| **Reporting** | PDF/Excel reports, custom date ranges, export |
| **Notifications** | In-app or email alerts for overruns, low stock, approval requests |
| **Mobile** | Progressive Web App (PWA) or native mobile app |
| **Audit log** | Track who changed what and when |
| **Document management** | Store contracts, drawings, certifications |
| **Multi-tenancy** | Support multiple companies in one deployment |
| **Advanced analytics** | Dashboards with charts, trends, forecasts |
| **Two-factor authentication** | 2FA for Admin and Accountant roles |
| **Offline support** | Work offline and sync when back online |
| **Internationalization** | Multi-language support |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2025 | — | Initial documentation |

---

*This document is intended for client and stakeholder reference. For technical implementation details, refer to the source code and inline comments.*
