# Deploy ERP Project Online (Demo / Showcase)

This guide walks you through deploying the **Construction ERP** app so you can share it as a live demo using this combo:

- **Frontend (React/Vite)** → **Vercel**
- **Backend (Go API)** → **Render**
- **Database (PostgreSQL)** → **Neon**
- **Files/uploads** → skipped (use Render ephemeral `/tmp` for demo)

---

## Overview

| Part        | Tech              | Recommended host | Why                          |
|------------|-------------------|------------------|------------------------------|
| Database   | PostgreSQL        | **Neon**         | Managed Postgres, free tier  |
| Backend    | Go (Gin) API      | **Render**       | Simple Go deploy, free tier  |
| Frontend   | React + Vite      | **Vercel**       | Free, fast, great for Vite   |

After deployment you'll have:
- **Frontend URL**: e.g. `https://your-erp-demo.vercel.app`
- **Backend API URL**: e.g. `https://your-erp-api.onrender.com/api/v1`

---

## Step 1: Create the Database on Neon (PostgreSQL)

1. Create an account at [Neon](https://neon.tech) and create a new project/database.

2. In Neon, copy your connection details.

3. You will map Neon’s details into the backend variables used by this project:

   - `DB_HOST` → Neon host (example: `ep-cool-xyz.us-east-2.aws.neon.tech`)
   - `DB_PORT` → usually `5432`
   - `DB_USER` → Neon user (example: `neondb_owner`)
   - `DB_PASSWORD` → Neon password
   - `DB_NAME` → Neon database name (often `neondb`)
   - `DB_SSLMODE` → **`require`**

---

## Step 2: Deploy the Backend (Go API) on Render

1. Sign up at [Render](https://render.com) and connect your GitHub repo.

2. Create a **Web Service**:
   - **New** → **Web Service**
   - Select your repo
   - **Root Directory**: leave blank (repo root)
   - **Runtime**: Go
   - **Build Command**: `go build -o server .`
   - **Start Command**: `./server`

3. Add **Environment Variables** (use your Neon values).

   **Option A – Recommended on Render:** set **`DB_URL`** to the **full** Neon connection string (Connect → copy). Use `DB_URL`, not `DATABASE_URL`, so Render’s auto-injected `DATABASE_URL` (if you added a Render Postgres) doesn’t override your Neon URL.

   ```env
   DB_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-pooler.xxx.aws.neon.tech/neondb?sslmode=require

   JWT_SECRET=<long random string>

   CORS_ORIGINS=https://your-erp-demo.vercel.app

   PORT=8080

   UPLOAD_DIR=/tmp/uploads
   ```

   **Option B:** use separate vars (leave `DB_URL` and `DATABASE_URL` unset):

   ```env
   DB_HOST=ep-xxx-pooler.xxx.aws.neon.tech
   DB_PORT=5432
   DB_USER=neondb_owner
   DB_PASSWORD=<from Neon>
   DB_NAME=neondb
   DB_SSLMODE=require

   JWT_SECRET=...
   CORS_ORIGINS=...
   PORT=8080
   UPLOAD_DIR=/tmp/uploads
   ```

4. Deploy:
   - Render will build and deploy.
   - Your backend base URL will look like `https://your-erp-api.onrender.com`
   - The frontend should use the API URL with prefix: **`https://your-erp-api.onrender.com/api/v1`**

5. Seed demo data (optional):
   - If you want demo users/data, run the repo scripts locally against Neon, or use a one-off command in Render.
   - Available scripts at repo root include:
     - `npm run seed:users`
     - `npm run seed:finance`

---

## Step 3: Deploy the Frontend (Vercel)

1. **Sign up**: [vercel.com](https://vercel.com) (GitHub login).

2. **Import project**  
   - **Add New** → **Project** → Import your GitHub repo.  
   - Set **Root Directory** to **`frontend`** (important).

3. **Build settings** (Vercel usually detects Vite):  
   - **Framework Preset**: Vite  
   - **Build Command**: `npm run build`  
   - **Output Directory**: `dist`

4. **Environment variables**  
   Add these in the project **Settings** → **Environment Variables**:

   | Name             | Value                                      | Environments   |
   |------------------|--------------------------------------------|-----------------|
   | `VITE_API_URL`   | `https://your-erp-api.onrender.com/api/v1` | Production, Preview |

   Replace with your actual Render backend URL including `/api/v1`.  
   If you use cookie-based auth in production, add:

   | Name                     | Value  |
   |--------------------------|--------|
   | `VITE_AUTH_USE_COOKIE`   | `true` |

5. **Deploy**  
   - Click **Deploy**. After build, you’ll get a URL like `https://your-erp-demo.vercel.app`.

6. **Update backend CORS**  
   - In Render, set `CORS_ORIGINS` to your **exact** Vercel URL, e.g. `https://your-erp-demo.vercel.app`.  
   - Redeploy the backend so CORS allows the frontend.

---

## Step 4: Optional – Use Your Own Domain

- **Vercel**: Project **Settings** → **Domains** → add your domain.  
- **Render**: Add a custom domain in the service settings and set `CORS_ORIGINS` to that frontend URL (and update `VITE_API_URL` if the API is on a custom domain).

---

## Quick Checklist

- [ ] Neon database created and connection details copied.  
- [ ] Backend deployed on Render with Neon `DB_*` env vars set.  
- [ ] Backend URL is `https://.../api/v1` (with `/api/v1`).  
- [ ] Frontend deployed on Vercel with **Root Directory** = `frontend`.  
- [ ] `VITE_API_URL` set to the backend API URL.  
- [ ] `CORS_ORIGINS` on backend set to the frontend URL (and redeployed).  
- [ ] Optional: seed demo data so the demo has something to show.

---

## Demo Login

If you use the seed script that creates demo users, log in with those credentials. Otherwise create an admin user (e.g. via a one-off script or a register flow if you have it) and use that for the showcase.

---

## Troubleshooting

- **CORS errors**: Ensure `CORS_ORIGINS` includes the exact frontend origin (no trailing slash), and that you redeployed the backend after changing it.  
- **401 on API calls**: Check that `VITE_API_URL` is correct and that the backend is running. For cookie auth, ensure the backend is configured for the same origin or correct cookie settings.  
- **Blank page / wrong routes**: The frontend includes a `vercel.json` that redirects all routes to `index.html` for React Router; if you use another host, configure SPA fallback similarly.

Once these steps are done, you can share the Vercel frontend URL as your live demo.
