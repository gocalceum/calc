# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack and Tools

**Package Manager**: Always use Bun, not npm/yarn/pnpm
- `bun install` instead of `npm install`
- `bun run <script>` instead of `npm run <script>`
- `bun test` for running tests
- Bun automatically loads .env files

**Frontend**: Vite + React + Tailwind CSS v3 + shadcn/ui
- Located in `/frontend` directory
- Uses Vite dev server on port 4011
- React Router v7 for routing
- shadcn/ui components with Radix UI primitives
- Tailwind CSS v3 (not v4) for styling

**Backend**: Bun server (TypeScript)
- Located in `/server` directory
- Runs on port 4010
- Uses native Bun APIs for server functionality

**Database & Auth**: Supabase
- PostgreSQL database
- Built-in authentication (email/password, OAuth)
- Row Level Security (RLS)
- Local development uses Supabase CLI with Docker

## Essential Commands

```bash
# Development
cd frontend && bun run dev    # Start frontend (port 4011)
cd server && bun run dev      # Start backend (port 4010)
bun run dev                    # Start both frontend and backend

# Local Supabase Development
bun run supabase:start         # Start local Supabase (requires Docker)
bun run supabase:stop          # Stop local Supabase
bun run supabase:status        # Check Supabase status
bun run supabase:reset         # Reset database with migrations

# Building
cd frontend && bun run build  # Build frontend for production

# Database
bun run db:setup              # Initial database setup
bun run db:push               # Push migrations to production

# Dependencies
bun install                   # Install root dependencies
bun run install:all           # Install all workspace dependencies
```

## Project Structure

Monorepo with three main workspaces:
- `/frontend` - React SPA with Vite
- `/server` - Bun TypeScript API server  
- `/supabase` - Database migrations and configuration

Key configuration files:
- `.env` - Production environment variables
- `.env.local` - Local development environment variables
- `frontend/vite.config.js` - Vite configuration (envDir points to parent directory)
- `supabase/config.toml` - Supabase local configuration

## Environment Variables

Frontend variables must be prefixed with `VITE_`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Server variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 4010)

## Authentication Architecture

The app uses Supabase Auth with:
- Client-side auth in React (`@supabase/ssr`)
- Session management in `App.jsx` and `Layout.jsx`
- Protected routes using React Router
- Auth state synchronized across components

## Styling and Components

- **CSS Framework**: Tailwind CSS v3 (not v4)
- **Component Library**: shadcn/ui with customizable primitives
- **CSS Variables**: Defined in `frontend/src/index.css` for theming
- **PostCSS**: Standard Tailwind v3 setup with autoprefixer

Important: When working with Tailwind, use v3 syntax:
- `@tailwind base/components/utilities` (not `@import "tailwindcss"`)
- Standard PostCSS config with `tailwindcss` and `autoprefixer` plugins

## Local Development URLs

When running locally with Supabase CLI:
- Frontend: http://localhost:4011
- Server API: http://localhost:4010  
- Supabase Studio: http://localhost:54323
- Supabase API: http://localhost:54321
- Email Testing (Inbucket): http://localhost:54324

## Testing

Currently no test files in the project. When adding tests:
- Use `bun test` to run tests
- Import from `bun:test` for test utilities
- Place test files as `*.test.ts` or `*.test.tsx`

## Common Issues and Solutions

**PostCSS/Tailwind conflicts**: Ensure dependencies are installed in the correct directory (frontend, not root)

**Port conflicts**: Kill existing processes with `lsof -ti:PORT | xargs kill -9`

**Vite not processing CSS**: Clear cache with `rm -rf node_modules/.vite`

**Module resolution issues**: Check for duplicate node_modules in parent directories