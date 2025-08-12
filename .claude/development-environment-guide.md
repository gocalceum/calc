# Development Environment Guide

## Overview
This project maintains strict separation between local development and production environments to prevent accidental data corruption and ensure safe testing.

## Environment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                      │
├─────────────────────────────────────────────────────────┤
│ Frontend (4011) ──► Local Supabase API (54321)          │
│ Backend (4010)  ──► Local PostgreSQL (54322)            │
│                     Studio UI (54323)                    │
│                     Mailpit Email (54324)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      PRODUCTION                          │
├─────────────────────────────────────────────────────────┤
│ Frontend (Amplify) ──► Supabase Cloud API               │
│ Backend (4010)     ──► Supabase PostgreSQL (Pooled)     │
└─────────────────────────────────────────────────────────┘
```

## Quick Start Commands

### 🚀 Start Local Development
```bash
# 1. Start local Supabase (requires Docker)
supabase start

# 2. Start frontend with local environment
cd frontend
VITE_SUPABASE_URL=http://localhost:54321 \
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0 \
bun run dev

# 3. Start backend with local environment
cd server && bun run dev  # Now uses .env.local by default
```

### 🌐 Test Against Production
```bash
# Frontend - uses .env (production)
cd frontend && bun run dev

# Backend - uses .env (production)
cd server && bun run dev:prod
```

## Environment Files

### `.env.local` (Local Development)
- **Purpose**: Connect to local Supabase Docker containers
- **Used by**: `bun run dev` commands
- **Key URLs**:
  - API: `http://localhost:54321`
  - Database: `postgresql://postgres:postgres@localhost:54322/postgres`
  - Studio: `http://localhost:54323`
  - Emails: `http://localhost:54324`

### `.env` (Production)
- **Purpose**: Connect to Supabase Cloud
- **Used by**: Production builds and `dev:prod` commands
- **Key URLs**:
  - API: `https://ducrwfvylwdaqpwfbdub.supabase.co`
  - Database: Via Supabase pooler

### `.env.example` (Template)
- **Purpose**: Template for new developers
- **Usage**: Copy to `.env` and fill in your values

## Port Reference

### Local Ports
- **4010**: Backend server
- **4011**: Frontend dev server
- **54321**: Supabase API (PostgREST)
- **54322**: PostgreSQL database
- **54323**: Supabase Studio UI
- **54324**: Mailpit (email capture)

### Why Different Ports?
- **54321** is the REST API (what your app uses)
- **54322** is direct database access (for migrations/SQL)

## Common Scenarios

### Scenario 1: Fresh Local Development Setup
```bash
# 1. Clone repo
git clone [repo]
cd calc

# 2. Install dependencies
bun install
cd frontend && bun install
cd ../server && bun install

# 3. Start local Supabase
cd .. && supabase start

# 4. Reset database with migrations
supabase db reset

# 5. Start development servers
# Terminal 1: Frontend
cd frontend && VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=[local_key] bun run dev

# Terminal 2: Backend
cd server && bun run dev
```

### Scenario 2: Switch from Production to Local
```bash
# 1. Stop any running servers (Ctrl+C)

# 2. Ensure local Supabase is running
supabase status  # Check status
supabase start   # Start if needed

# 3. Restart with local environment
cd frontend && VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=[local_key] bun run dev
cd server && bun run dev
```

### Scenario 3: Test Production Before Deployment
```bash
# Use production environment locally
cd frontend && bun run dev        # Uses .env (production)
cd server && bun run dev:prod     # Uses .env (production)
```

## Troubleshooting

### Issue: "Port already in use"
```bash
# Kill specific port
lsof -ti:4011 | xargs kill -9  # Frontend
lsof -ti:4010 | xargs kill -9  # Backend
```

### Issue: Can't connect to local database
```bash
# Check Supabase status
supabase status

# If not running
supabase start

# If issues persist, restart
supabase stop && supabase start
```

### Issue: Wrong environment (local vs prod)
**Check server logs:**
- ✅ Local: `🔗 Connected to: http://localhost:54321`
- ❌ Prod: `🔗 Connected to: https://ducrwfvylwdaqpwfbdub.supabase.co`

**Fix:**
```bash
# For local development
cd server && bun run dev  # Uses .env.local

# For production testing
cd server && bun run dev:prod  # Uses .env
```

### Issue: Emails not being received locally
- Local development has email confirmations **disabled** by default
- Check captured emails at: http://localhost:54324 (Mailpit)
- To enable: Edit `supabase/config.toml`, set `enable_confirmations = true`

## Best Practices

### ✅ DO
- Always use `bun run dev` for local development (now defaults to .env.local)
- Check server logs to verify environment
- Use Mailpit for testing emails locally
- Reset local database frequently: `supabase db reset`

### ❌ DON'T
- Don't commit `.env` or `.env.local` files
- Don't use production database for testing
- Don't mix environment variables between local and production
- Don't forget to start Docker before `supabase start`

## OAuth Configuration

### Local OAuth (Google)
Local Supabase has Google OAuth configured in `supabase/config.toml`:
```toml
[auth.external.google]
enabled = true
client_id = "..."
secret = "..."
skip_nonce_check = true  # Required for local
```

**Note**: Google OAuth in local requires adding `http://localhost:54321/auth/v1/callback` to your Google Console authorized redirects.

### Recommendation
Use email/password auth for local development to avoid OAuth complexity.

## Database Migrations

### Create New Migration
```bash
supabase migration new migration_name
```

### Apply to Local
```bash
supabase db reset  # Resets and applies all migrations
```

### Apply to Production
```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_SERVICE_KEY \
supabase db push --password "$SUPABASE_DB_PASSWORD"
```

## Scripts Reference

### Frontend (package.json)
- `dev` - Start with Vite (uses .env by default)

### Backend (package.json)
- `dev` - Local development (uses .env.local)
- `dev:prod` - Production testing (uses .env)
- `start` - Production mode (uses .env)

## Environment Variables Quick Reference

### Required for Local Development
```bash
# Frontend
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Backend
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

These are the **same for all local Supabase installations** - no need to change them!