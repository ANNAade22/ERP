# Silverline LTD ERP — User Guide

This guide explains how to use the **Construction ERP** web application day to day. It is written for everyone who logs in: managers, site staff, finance, and store teams.

---

## 1. What this system does

The ERP helps your organization:

- Track **projects**, **milestones**, and **site photos**
- Monitor **budgets**, **spending**, **cash flow**, and **invoices**
- Manage **equipment** and **maintenance**
- Handle **vendors / contractors** and **material requests**
- See **stock levels** and **labor attendance** summaries

You use it in a **web browser** (Chrome, Edge, or Firefox recommended). Your administrator will give you the **website address (URL)** to open.

---

## 2. Signing in

1. Open the ERP URL in your browser.
2. Enter the "admin@erp.com"  and "password123" your administrator gave you.
3. Click to sign in. If you see an error, check spelling and caps lock, or contact your admin to reset your password.

**Security tips**

- Do not share your password.
- Sign out when you finish on a shared computer (use **Logout** in the header if available).

---

## 3. Who can see what (roles)

The sidebar menu changes based on your **role**. If you open a page you are not allowed to use, the system will send you back to the **Dashboard** with a short message.

| Role | Typical use |
|------|----------------|
| **Admin** | Full access, including **User Registry** (create users, roles, password resets) |
| **Project Manager** | Projects, equipment, finance, vendors, inventory, attendance |
| **Site Engineer** | Projects, Gantt/milestones, inventory, attendance (no finance-only areas unless combined) |
| **Accountant** | Finance areas and vendors |
| **Store Officer** | Vendors and inventory (stock and material requests) |

**Everyone** can use the **Dashboard** (for their own profile).

--------------------------------------------------------------------

## 4. Finding your way around

### Main menu (left sidebar)

- Click a menu item to open that area.
- Items with a small arrow have **sub-pages** (for example **Projects** → *Project Management* and *Gantt & Milestones*).
- Use the **collapse** button at the top of the sidebar if you want more space on small screens.

### Header

- Your **name** and **role** usually appear at the top.
- Notifications may appear as small pop-up messages when you save or when something fails.

### Guided tours

On some pages you will see a **Take tour** button. It walks you through the main parts of that screen. You can run it again anytime.

---

## 5. Dashboard

The **Dashboard** is the home page after login. It shows **summary cards** and tables such as:

- Active projects and budget use
- Equipment and procurement request counts
- Labor attendance overview
- Low stock alerts (when relevant)

Many cards **link** to the related section (for example projects or finance). Click them to go straight there.

----------------------------------------------------------------

## 6. Equipment

*(Visible to **Admin** and **Project Manager**.)*

Use **Equipment** to:

- See **how many** machines or vehicles you have, and how many are **available** or **under maintenance**
- **Add**, **edit**, or remove equipment records
- Plan **maintenance** (types such as repair, inspection, preventive)
- View **schedules** tied to projects where applicable

Keep locations and service dates up to date so reports stay accurate.

-----------------------------------------------------------------------

## 7. Projects

*(Visible to **Admin**, **Project Manager**, and **Site Engineer**.)*

### Project Management (`/projects`)

- **Search** and **filter** projects by status, category, and other options.
- **Create** a new project with details such as name, location, budget, dates, contractor, and description.
- **Open** a project to see its **detail** page.
- **Edit** or **delete** projects when your process allows (deleting removes that project from the list—use care).

### Project detail

On a project’s page you typically see:

- Status, category, budget, and spending progress
- **Milestones** summary
- **Site photos** (with captions)
- **Vendors** linked to that project (counts and values where available)

Use the link back to **Projects** to return to the list.

### Gantt & Milestones

- Pick a **project**, then manage **milestones** on a timeline (Gantt-style view).
- Add milestones with **titles**, **dates**, **status**, and **progress**.
- **Completed** projects may **lock** milestone editing so history stays correct.
- You can attach **site photos** to milestones where the system supports it.

---

## 8. Labor Attendance

*(Visible to **Admin**, **Project Manager**, and **Site Engineer**.)*

- Shows **today’s** attendance **by project**: workers present, absent, and attendance rate.
- Numbers **refresh automatically** about every **30 seconds** while you stay on the page.
- Use this page for a quick operational view of all active sites.

---

## 9. Vendors — Manage Contractors

*(Visible to **Admin**, **Project Manager**, **Accountant**, and **Store Officer**.)*

- **Search** the vendor list.
- **Add** or **edit** vendors with contact details, address, type (e.g. contractor, supplier), **status** (Active / Preferred / Inactive), and notes.
- **Ratings** and reliability help compare suppliers over time.
- **Delete** only when your policy allows (removed vendors may affect old records—follow company rules).

---

## 10. Inventory

### Stock Levels

*(Visible to **Admin**, **Project Manager**, **Site Engineer**, and **Store Officer**.)*

- View **materials** per project: current stock, **minimum** stock, and units (kg, bag, piece, etc.).
- **Add** materials, **adjust** stock (in/out) with a reason, or **remove** a material line when appropriate.
- See **recent orders** and links to procurement where the app shows them.
- Data **refreshes** on a timer so you see updates without reloading the page.

### Material Requests (purchase requests)

- **Create** a request: choose **project**, **vendor** (if known), **line items** (material, quantity, unit price), and **notes**.
- Requests move through statuses such as:  
  **Pending** → **Approved** / **Rejected** → **Ordered** → **Received**  
  (Exact actions depend on your role and your company’s workflow.)
- **Approve**, **reject**, **mark ordered**, or **mark received** according to your permissions.
- You can **edit** some requests while they are still open.

---

## 11. Finance

*(Visible to **Admin**, **Project Manager**, and **Accountant**.)*

### Finance Overview

- High-level **totals**: budget, spent, remaining, utilization.
- Quick links to deeper finance pages.

### Budget Tracker

- See budget versus actuals **by project** or in summary form.
- Use it to spot projects that are using budget quickly.

### Cash Flow

- Understand **money in and out** over time (as configured in your system).

### Profitability

- View **profit-focused** views tied to projects or categories (depending on your data).

### Overrun Alerts

- Highlights where spending may **exceed** budget or needs attention.

### Invoices & Payments

- List **invoices** with vendor, project, amounts, dates, and **status** (Pending, Partially Paid, Paid, Overdue).
- **Add** new invoices and record **payments** with methods such as bank transfer, cheque, card, or cash.
- Use **filters** and **search** to find invoices quickly.
- Some actions may **prefill** from purchase requests when you start them from another screen.

---

## 12. User Registry (Admin only)

*(Only **Admin** users.)*

Admins can:

- **List** all users and **filter** by role.
- **Add** users: name, email, password, and **role**.
- **Change** a user’s **role** (when your process allows).
- **Reset passwords** for other users.
- **Upload** or **remove** **profile photos** for users (recommended formats and size limits apply—follow on-screen hints).
- **Deactivate** users if your screen includes that option.

Password rules (minimum length and complexity) apply when setting or resetting passwords.

---

## 13. Settings

**Everyone** can open **Settings**.

### Profile

- Update your **name**, **email**, and **phone**.
- Your **role** is shown for reference and is usually **not** editable here (admins change roles in the **Registry**).

**Profile picture:** The guide in the app may state that photos are **managed by admins** in the User Registry.

### Company information

- Fields such as **company name**, **tax ID**, **address**, and **currency** may be shown for your own reference on documents or screens.
- In this application, **company information is saved in your browser** on that device. If you change computers or clear browser data, you may need to enter it again. Click **Save Changes** after edits.

Use **Cancel** to discard unsaved changes on that page.

---

## 14. If something goes wrong

| Problem | What to try |
|--------|-------------|
| Cannot log in | Check email/password; ask an **Admin** to reset your password in **Registry**. |
| “No permission” or redirect to Dashboard | Your **role** does not include that page; ask an Admin if you need access. |
| Empty or old data | Refresh the page; wait a few seconds on pages that **auto-refresh**. |
| Save failed | Read the red error message; check required fields; try again. If it persists, contact your technical support or Admin. |

---

## 15. Quick reference — menu map

| Menu | What it is for |
|------|----------------|
| Dashboard | Overview and shortcuts |
| Equipment | Fleet and maintenance |
| Projects → Project Management | Project list and details |
| Projects → Gantt & Milestones | Timelines and milestones |
| Attendance | Today’s labor attendance by site |
| Vendors → Manage Contractors | Supplier and contractor master data |
| Inventory → Stock Levels | Materials and stock |
| Inventory → Material Requests | Purchase / material requests |
| Finance → … | Budgets, cash flow, profitability, overruns, invoices |
| Registry | **Admin:** user accounts |
| Settings | Your profile and local company display preferences |

---

## 16. Support

For **access**, **passwords**, and **role changes**, contact your **system administrator**.

For **bugs**, **wrong numbers**, or **training**, follow your organization’s internal IT or project support process.

---

*Document version: March 2026 — matches the Silverline LTD ERP application structure.*
