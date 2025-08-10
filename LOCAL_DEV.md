# Local Development with Supabase CLI

## Prerequisites
- Docker Desktop installed and running
- Supabase CLI installed
- Bun installed

## Quick Start

### 1. Start Docker Desktop
Make sure Docker Desktop is running before proceeding.

### 2. Start Supabase Local Services
```bash
bun run supabase:start
# or
supabase start
```

This will start:
- **Postgres Database** - http://localhost:54322
- **Supabase Studio** - http://localhost:54323
- **API Gateway** - http://localhost:54321
- **Email Testing (Inbucket)** - http://localhost:54324

### 3. Run the Application with Local Environment
```bash
# Use local environment variables
export $(cat .env.local | xargs)

# Start both frontend and server
bun dev

# Or run them separately:
# Terminal 1
cd server && bun run dev

# Terminal 2  
cd frontend && bun run dev
```

## Local URLs & Credentials

### Service URLs
- **Frontend**: http://localhost:4011
- **Server API**: http://localhost:4010
- **Supabase Studio**: http://localhost:54323
- **Supabase API**: http://localhost:54321
- **Database**: postgresql://postgres:postgres@localhost:54322/postgres
- **Email Testing**: http://localhost:54324

### Default Credentials
- **Database Password**: `postgres`
- **Test User Email**: `test@example.com`
- **Test User Password**: `test123456`

### API Keys (for local development only)
These are standard Supabase local development keys:
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **Service Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`

## Available Commands

### Supabase Management
```bash
# Start local Supabase
bun run supabase:start

# Stop local Supabase
bun run supabase:stop

# Check status
bun run supabase:status

# Reset database (runs migrations and seeds)
bun run supabase:reset
```

### Development
```bash
# Run with local environment
bun run dev:local

# Run with production environment
bun dev
```

## Switching Between Local and Production

### Use Local Environment
```bash
export $(cat .env.local | xargs)
bun dev
```

### Use Production Environment
```bash
export $(cat .env | xargs)
bun dev
```

## Testing Email/Auth Flow

1. Open http://localhost:4011
2. Enter an email address
3. Click "Send magic link"
4. Open http://localhost:54324 (Inbucket)
5. Click on the email
6. Click the magic link to complete authentication

## Database Management

### Access Supabase Studio
Open http://localhost:54323 to manage your local database visually.

### Run Migrations
```bash
supabase db reset  # Reset and re-run all migrations
```

### Connect with SQL Client
```
Host: localhost
Port: 54322
Database: postgres
Username: postgres
Password: postgres
```

## Troubleshooting

### Docker not running
```
Error: Cannot connect to Docker daemon
Solution: Start Docker Desktop
```

### Port already in use
```bash
# Kill process on specific port
lsof -ti:54321 | xargs kill -9
```

### Reset everything
```bash
supabase stop --no-backup
supabase start
```

## Features Available Locally

✅ Authentication (Email/Password, Magic Links)
✅ Database with migrations
✅ Row Level Security (RLS)
✅ Realtime subscriptions
✅ Storage (if configured)
✅ Edge Functions
✅ Email testing via Inbucket

## Production Deployment

When ready to deploy to production, ensure you:
1. Have production environment variables in `.env`
2. Run migrations on production: `bun run db:push`
3. Update CORS settings if needed
4. Configure proper authentication providers