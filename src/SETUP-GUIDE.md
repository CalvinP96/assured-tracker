# Assured Energy Solutions — Shared Database Setup Guide

## What You're Getting

Your project tracker will go from browser-only (each person sees their own data) to a **shared real-time database** where every employee sees the same projects, and changes sync instantly across all browsers.

**Stack:** React + Vite + Supabase (free) + Cloudflare Pages (free)

---

## Step 1: Create a Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Name it `assured-tracker`, set a database password (save this), pick the region closest to you
4. Wait ~2 minutes for it to provision

### Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire contents of `schema.sql` and click **Run**
4. You should see "Success. No rows returned" — that's correct

### Enable Realtime

1. Go to **Database → Replication** (left sidebar)
2. Make sure the `projects` table has realtime enabled (the schema already does this, but double-check the toggle is on)

### Get Your API Keys

1. Go to **Settings → API** (left sidebar)
2. Copy the **Project URL** (looks like `https://abc123.supabase.co`)
3. Copy the **anon/public key** (long string starting with `eyJ...`)

---

## Step 2: Set Up the React Project Locally (5 min)

```bash
# Create the project
npm create vite@latest assured-tracker -- --template react
cd assured-tracker

# Install Supabase client
npm install @supabase/supabase-js

# Remove the default src files
rm src/App.jsx src/App.css src/index.css
```

### Copy Your Files In

Copy these files into your project's `src/` folder:
- `src/supabaseClient.js`  — DB connection
- `src/useProjects.js`     — Data hook (CRUD + real-time)
- `src/Auth.jsx`           — Login screen
- `src/App.jsx`            — Main app (updated for Supabase)
- `src/main.jsx`           — Entry point

### Add Your Keys

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...your-anon-key
```

### Test Locally

```bash
npm run dev
```

Open `http://localhost:5173` — you should see the login screen.

---

## Step 3: Add Your Employees (3 min)

In Supabase dashboard → **Authentication** → **Users**:

1. Click **Invite User**
2. Enter the employee's email address
3. They'll get an email with a link to set their password
4. Repeat for each team member

**That's it.** Only invited users can log in and see the data.

### Optional: Restrict to Your Email Domain

To lock signups to your company email domain only:

1. Go to **Authentication → Providers → Email**
2. Under **Restricted email domains**, add your domain (e.g., `assuredenergy.com`)

---

## Step 4: Deploy to Cloudflare Pages (10 min)

### Push to GitHub First

```bash
# In your project folder
git init
git add .
git commit -m "initial commit"

# Create a private repo (install GitHub CLI if needed: brew install gh)
gh repo create assured-tracker --private --source=. --push
```

### Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign up (free)
2. Click **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Authorize GitHub and select your `assured-tracker` repo
4. Configure the build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Add **environment variables**:
   - `VITE_SUPABASE_URL` → your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
6. Click **Save and Deploy**

Your app will be live at `https://assured-tracker.pages.dev` (or a custom domain).

### Optional: Cloudflare Access (extra layer of security)

If you want to add network-level protection on top of Supabase auth:

1. In Cloudflare, go to **Zero Trust** → **Access** → **Applications**
2. Add your Pages URL
3. Create a policy: **Allow** → **Emails** → list your employees' emails
4. Now employees need to verify their email with Cloudflare AND log in with Supabase

---

## How It All Works

```
┌─────────────────────────────────────────────┐
│  Employee's Browser                         │
│  ┌───────────────────────────────────────┐  │
│  │  React App (Cloudflare Pages)         │  │
│  │  - Login screen (Auth.jsx)            │  │
│  │  - Project tracker (App.jsx)          │  │
│  │  - Real-time sync (useProjects.js)    │  │
│  └────────────┬──────────────────────────┘  │
│               │                              │
└───────────────┼──────────────────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────────────────┐
│  Supabase (Cloud)                           │
│  - PostgreSQL database (projects table)     │
│  - Authentication (email + password)        │
│  - Row Level Security (team-only access)    │
│  - Real-time websocket (instant sync)       │
└─────────────────────────────────────────────┘
```

When **Employee A** saves a project, the change:
1. Writes to Supabase instantly
2. Supabase broadcasts the change via websocket
3. **Employee B, C, D** all see the update in real-time — no refresh needed

---

## File Reference

| File | Purpose |
|------|---------|
| `schema.sql` | Run once in Supabase SQL Editor to create the database |
| `src/supabaseClient.js` | Connects to your Supabase instance |
| `src/useProjects.js` | React hook: loads projects, CRUD operations, real-time sync |
| `src/Auth.jsx` | Login/logout UI, wraps the app |
| `src/App.jsx` | Your full project tracker (now using Supabase instead of localStorage) |
| `src/main.jsx` | Entry point that wraps App with Auth |
| `.env` | Your Supabase URL and key (never commit this!) |

---

## Troubleshooting

**"No projects showing"** → Make sure you ran `schema.sql` in the SQL Editor

**"Login not working"** → Check that you invited the user in Authentication → Users

**"Changes not syncing"** → Verify realtime is enabled: Database → Replication → projects toggle ON

**"Permission denied errors"** → The RLS policies in schema.sql should handle this. Make sure you ran the full SQL file.

**Cost:** Supabase free tier gives you 500MB database, 50K monthly active users, unlimited API requests. Cloudflare Pages is free. **Total cost: $0** for a small team.
