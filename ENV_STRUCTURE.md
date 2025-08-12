# Environment Configuration Structure

## Overview
This project uses different environment files for local development and production.

## Environment Files

### 1. `.env` (Production/Default)
- **Purpose**: Production configuration - connects to Supabase Cloud
- **When to use**: When deploying to production or testing against production data
- **Key URLs**:
  - Supabase: `https://ducrwfvylwdaqpwfbdub.supabase.co`
  - Database: AWS RDS via Supabase pooler

### 2. `.env.local` (Local Development)
- **Purpose**: Local development - connects to local Supabase instance
- **When to use**: For local development and testing
- **Key URLs**:
  - Supabase: `http://localhost:54321`
  - Database: `postgresql://postgres:postgres@localhost:54322/postgres`
  - Studio: `http://localhost:54323`
  - Mailpit (emails): `http://localhost:54324`

### 3. `.env.example` (Template)
- **Purpose**: Template for new developers
- **When to use**: Copy this to create your own `.env` file

## How to Use

### For Local Development:
```bash
# 1. Start local Supabase (requires Docker)
supabase start

# 2. Run frontend with local environment
cd frontend && VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0 bun run dev

# 3. Run backend (if needed)
cd server && bun --env-file=../.env.local run dev
```

### For Production Testing:
```bash
# 1. Run frontend with production environment
cd frontend && bun run dev  # Uses .env by default

# 2. Run backend with production environment
cd server && bun run dev  # Uses .env by default
```

## Database Connections

### Local Database (PostgreSQL on Docker)
- **Direct connection**: `postgresql://postgres:postgres@localhost:54322/postgres`
- **Via Supabase API**: `http://localhost:54321`
- **Default credentials**:
  - Username: `postgres`
  - Password: `postgres`
  - Database: `postgres`
  - Port: `54322`

### Production Database (Supabase Cloud)
- **Pooled connection**: `postgresql://postgres.ducrwfvylwdaqpwfbdub:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
- **Via Supabase API**: `https://ducrwfvylwdaqpwfbdub.supabase.co`
- **Password**: Stored in `.env` as `SUPABASE_DB_PASSWORD`

## Environment Variables Reference

### Frontend (VITE_ prefix required)
- `VITE_SUPABASE_URL`: Supabase API URL
- `VITE_SUPABASE_ANON_KEY`: Public anonymous key for Supabase

### Backend/Server
- `SUPABASE_URL`: Supabase API URL (for server-side operations)
- `SUPABASE_SERVICE_KEY`: Service role key (admin access)
- `DATABASE_URL`: Direct PostgreSQL connection string
- `SUPABASE_DB_PASSWORD`: Database password for migrations

### Ports
- `PORT`: Backend server port (default: 4010)
- `VITE_PORT`: Frontend dev server port (default: 4011)

## Common Issues & Solutions

### Can't connect to local database
1. Check if Supabase is running: `supabase status`
2. If not running: `supabase start`
3. If port conflict: `supabase stop && supabase start`

### Frontend connecting to wrong environment
1. Kill the frontend process: `lsof -ti:4011 | xargs kill -9`
2. Restart with correct environment variables (see commands above)

### Email not working locally
- Local emails are captured in Mailpit: http://localhost:54324
- Email confirmations are disabled by default in local development