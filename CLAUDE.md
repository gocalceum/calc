# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

**Package Manager**: Bun (NOT npm/yarn/pnpm)
**Frontend**: React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui
**Backend**: Bun server (TypeScript) - minimal, mainly for future API needs
**Database**: Supabase (PostgreSQL + Auth + RLS)
**Deployment**: AWS Amplify (frontend) + Supabase Cloud (backend)

## Essential Commands

```bash
# LOCAL DEVELOPMENT (uses .env.local → local Supabase)
supabase start                 # Start local Supabase first
cd frontend && VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0 bun run dev
cd server && bun run dev       # Backend local (uses .env.local)

# PRODUCTION TESTING (uses .env → production Supabase)
cd frontend && bun run dev     # Frontend prod mode
cd server && bun run dev:prod  # Backend prod mode

# Quality Checks
cd frontend && bun run lint    # ESLint
cd frontend && bun run type-check  # TypeScript check
cd frontend && bun run format:check  # Prettier check

# Building
cd frontend && bun run build   # Production build

# Database Migrations
supabase migration new <name>  # Create new migration
supabase db reset              # Reset local DB with migrations
SUPABASE_ACCESS_TOKEN=$SUPABASE_SERVICE_KEY supabase db push --password "$SUPABASE_DB_PASSWORD"  # Push to production

# Local Supabase Management
supabase start                 # Start local Supabase
supabase stop                  # Stop local Supabase
supabase status                # Check local Supabase status
```

## Architecture Overview

### Multi-Tenant SaaS Structure
The app implements a multi-tenant architecture with:
- **Organizations**: Top-level tenant container
- **Entities**: Business entities within organizations (companies, individuals, trusts)
- **Organization Members**: Users belonging to organizations with roles (owner, admin, member)
- **Entity Permissions**: Fine-grained access control for entities

### Database Schema
Key tables with RLS enabled:
- `profiles` - User profiles linked to auth.users
- `organizations` - Tenant organizations
- `organization_members` - User-organization relationships
- `entities` - Business entities (multi-type: company, individual, trust, partnership)
- `entity_permissions` - User-entity access control
- `calculations` - Core business logic storage
- `audit_logs` - Activity tracking

### Authentication Flow
1. Supabase Auth handles email/password and OAuth (Google, GitHub, GitLab)
2. Session management in `App.tsx` using `supabase.auth.onAuthStateChange`
3. Protected routes via React Router conditional rendering
4. OAuth redirects configured for production domain (app.calceum.com)

### Frontend Routing
- `/login`, `/signup` - Authentication pages
- `/dashboard` - Main app entry after auth
- `/onboarding` - Organization setup for new users
- `/entities/*` - Entity management (list, detail, new)
- `/settings`, `/profile` - User management

### Component Architecture
- **Contexts**: `OrganizationContext`, `EntityContext` for global state
- **UI Components**: shadcn/ui primitives in `/frontend/src/components/ui/`
- **Layout**: Sidebar navigation with collapsible sections
- **Styling**: Tailwind CSS v3 with CSS variables for theming

## Environment Variables

### Environment Files Structure
- **`.env`** - Production configuration (Supabase Cloud)
- **`.env.local`** - Local development (Local Supabase on Docker)
- **`.env.example`** - Template for new developers

### Local Development (.env.local)
```
# Frontend (Vite requires VITE_ prefix)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Production (.env)
```
# Frontend
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_ANON_KEY=[anon_key]

# Backend
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service_key]
DATABASE_URL=postgresql://postgres.[project]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

### CI/CD (GitHub Secrets)
```
SUPABASE_ACCESS_TOKEN    # Service role token
SUPABASE_DB_PASSWORD     # Database password
AWS_ACCESS_KEY_ID        # For Amplify deployment
AWS_SECRET_ACCESS_KEY    # For Amplify deployment
```

## Deployment Pipeline

### AWS Amplify Configuration
- **App ID**: d21tj2auyhfczb
- **Region**: eu-west-2
- **Domain**: app.calceum.com
- **Build spec**: `amplify.yml` with Bun installation and AWS Secrets Manager integration

### CI/CD Workflows
1. **`.github/workflows/ci-cd.yml`**: 
   - PR checks: TypeScript, ESLint, build verification
   - Main branch: Monitors Amplify webhook deployment
   - Runs TypeScript smoke tests post-deployment

2. **`.github/workflows/database-migration.yml`**:
   - Auto-applies migrations when pushed to main
   - Syncs database schema with code deployments

### Monitoring GitHub Actions After Push
**IMPORTANT**: After every push to main, monitor the CI/CD pipeline:
```bash
# Watch the latest workflow run
gh run watch

# Check workflow status
gh run list --workflow=ci-cd.yml --limit=1

# View failed steps if any
gh run view --log-failed

# Check Amplify deployment directly
aws amplify list-jobs --app-id d21tj2auyhfczb --branch-name main --max-items 3
```

The pipeline should complete all steps:
1. ✅ Code Quality checks (TypeScript, ESLint, Prettier)
2. ✅ Deploy to Production (monitors Amplify webhook)
3. ✅ Smoke Tests (TypeScript tests against production)

### Production URLs
- App: https://app.calceum.com
- Supabase: https://ducrwfvylwdaqpwfbdub.supabase.co

## Development Guidelines

### Pre-Commit Hooks
Automatic quality checks run before every commit via Husky + lint-staged:
- **TypeScript files**: ESLint fix → Prettier format → TypeScript type-check
- **JavaScript files**: ESLint fix → Prettier format
- **Other files**: Prettier format (JSON, CSS, Markdown)

To bypass hooks in emergencies: `git commit -m "message" --no-verify`

### Code Quality Commands
```bash
# Run all checks manually
cd frontend && bun run lint        # ESLint
cd frontend && bun run type-check  # TypeScript
cd frontend && bun run format:check # Prettier check
cd frontend && bun run format      # Fix formatting

# Run smoke tests after deployment
node scripts/smoke-test.js
```

### Tailwind CSS
Always use v3 syntax:
- `@tailwind base/components/utilities` (NOT `@import "tailwindcss"`)
- PostCSS with `tailwindcss` and `autoprefixer` plugins

### TypeScript
- Strict mode enabled
- All components must be properly typed
- Use type imports: `import type { ... }`
- Type errors block commits and deployments

### Database Operations
- Always use RLS policies for security
- Migrations in `supabase/migrations/`
- Test locally with `supabase db reset` before pushing

### State Management
- Use React Context for global state (Organization, Entity)
- Supabase real-time subscriptions for live updates
- Session state managed at App.tsx level

## Common Issues

**Port conflicts**: `lsof -ti:4011 | xargs kill -9`
**Vite cache**: `rm -rf frontend/node_modules/.vite`
**Module resolution**: Check for duplicate node_modules in parent dirs
**OAuth redirects**: Update in Supabase Dashboard > Authentication > URL Configuration