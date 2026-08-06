# Kaizen Tracker — Deployment Directions (Vercel & Railway)

This document provides step-by-step instructions for deploying the Kaizen Tracker Next.js application to **Vercel** and **Railway**.

---

## ⚡ Deployment to Vercel

Vercel is the recommended hosting platform for Next.js applications, offering seamless serverless integration.

### Step 1: Push Project to GitHub
Initialize git, commit your files, and push your repository to GitHub:
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/username/kaizen-tracker.git
git branch -M main
git push -u origin main
```

### Step 2: Create a PostgreSQL Database
If you do not have a hosted database, you can provision one:
1. Create a serverless Postgres instance on **Neon** or **Vercel Postgres**.
2. Keep the **connection string** (URL) handy. It should start with `postgres://` or `postgresql://`.

### Step 3: Link Vercel Project
1. Log into [Vercel](https://vercel.com).
2. Click **Add New** > **Project** and import your GitHub repository.
3. In the **Environment Variables** accordion dropdown, add all keys from your `.env.local`:
   * `DATABASE_URL` (your live database connection string)
   * `AUTH_SECRET` / `NEXTAUTH_SECRET` (generate a base64 key using `openssl rand -base64 32`)
   * `NEXTAUTH_URL` (your custom Vercel domain or generated URL, e.g. `https://kaizen-tracker.vercel.app`)
   * `RESEND_API_KEY`
   * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   * `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
4. Click **Deploy**.

### Step 4: Run Post-Build Migrations on Vercel
In `package.json`, we have defined the following run scripts:
* `"build": "next build"`
* `"postbuild": "tsx src/db/migrate.ts"`

Vercel automatically executes `"postbuild"` scripts upon completing compilation! This guarantees that migrations are applied to your PostgreSQL instance during every Vercel deployment without manual shell operations.

---

## 🚂 Deployment to Railway

Railway is an excellent platform for deploying containerized web apps and hosting PostgreSQL databases under a single unified environment.

### Step 1: Create a Project & Provision PostgreSQL
1. Log into your [Railway Console](https://railway.app).
2. Click **New Project** > **Provision PostgreSQL**.
3. Railway will spin up a PostgreSQL service and create a `DATABASE_URL` automatically.

### Step 2: Deploy Next.js Service
1. Click **New** > **GitHub Repo** and connect your Kaizen Tracker repository.
2. Railway will link the repository and create a new container service.

### Step 3: Configure Environment Variables
Go to the **Variables** tab of your Next.js service and bind the variables:
* Set `DATABASE_URL` to reference the PostgreSQL service: `${{Postgres.DATABASE_URL}}`
* Add:
  * `AUTH_SECRET` / `NEXTAUTH_SECRET`
  * `NEXTAUTH_URL` (set to your Railway assigned domain, e.g. `https://kaizen-production.up.railway.app`)
  * `RESEND_API_KEY`
  * `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
  * `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

### Step 4: Configure Start & Build Settings
Railway automatically detects Next.js build configuration. 
Verify the build scripts in **Settings**:
<!-- * **Build Command**: `npm run build`
* **Start Command**: `npm run start` -->

Since Railway runs `npm run build` during deployment, the `postbuild` hook (`tsx src/db/migrate.ts`) will execute automatically, ensuring that migrations are initialized on the provisioned PostgreSQL service before the container starts!
