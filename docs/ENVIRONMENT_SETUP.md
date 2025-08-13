# Environment Setup Guide

## Simple Structure (Best Practice)

We follow the standard pattern with just 2 files:

```
.env.example    ← Template (tracked in git)
.env.local      ← Your config (gitignored)
```

That's it. No confusion, no redundancy.

## Quick Start

### 1. Copy the template
```bash
cp .env.example .env.local
```

### 2. For Local Development with Docker Supabase

Get your local values:
```bash
supabase status
```

Then update `.env.local` with:
- The anon key from the output
- The service_role key from the output
- Keep the localhost URLs

Or use these Docker defaults (same for everyone):
```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

### 3. Start Development
```bash
# Start local Supabase
supabase start

# Start frontend
cd frontend && bun run dev

# Frontend will use values from .env.local
```

## Production Configuration

**NEVER** create a `.env` file with production values!

Production secrets go in:
- **GitHub Secrets** - For CI/CD workflows
- **AWS Amplify** - Environment variables in console
- **Supabase Dashboard** - For OAuth and SMTP

## Why This Structure?

1. **Industry Standard**: Most developers expect `.env.example` + `.env.local`
2. **Clear Purpose**: Example shows structure, local has your values
3. **No Confusion**: Just two files with obvious roles
4. **Git-friendly**: Example is tracked, local is ignored

## Common Mistakes to Avoid

❌ Don't create multiple example files
❌ Don't put real secrets in .env.example
❌ Don't create .env with production values
❌ Don't commit .env.local

## File Reference

| File | Purpose | In Git? | Contains |
|------|---------|---------|----------|
| `.env.example` | Template | ✅ Yes | Placeholders & instructions |
| `.env.local` | Your config | ❌ No | Your actual values |
| `.env` | DON'T CREATE | ❌ No | Would be production (dangerous) |