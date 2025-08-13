# Environment Configuration Best Practices

## Current State
- **No .env files exist in the repository** (which is good!)
- All sensitive data is stored in GitHub Secrets for CI/CD
- Local development uses hardcoded local values

## Best Practice Structure

### 1. Never Store Sensitive Data in Repository
✅ **Current Status**: Good - no .env files are tracked

**Sensitive data that should NEVER be in repo:**
- Database passwords (`SUPABASE_DB_PASSWORD`)
- Service keys (`SUPABASE_SERVICE_KEY`)
- API keys (`RESEND_API_KEY`)
- OAuth secrets

### 2. Environment File Structure

```
/calc
├── .env.example          # Template with dummy values (tracked)
├── .env.local            # Local development (gitignored)
└── frontend/
    └── .env.local        # Frontend-specific local config (gitignored)
```

**Note**: Production values should come from:
- CI/CD secrets (GitHub Actions)
- Deployment platform (AWS Amplify environment variables)
- Never from .env files

### 3. Where Secrets Should Live

| Environment | Location | Access Method |
|------------|----------|---------------|
| Local Development | `.env.local` (gitignored) | Direct from file |
| CI/CD Pipeline | GitHub Secrets | `${{ secrets.SECRET_NAME }}` |
| Production Frontend | AWS Amplify Console | Environment variables |
| Production Backend | AWS Secrets Manager | Via IAM role |
| Database Migrations | GitHub Actions only | Never stored locally |

### 4. Security Issues to Fix

#### ❌ Current Issues:
1. `SUPABASE_DB_PASSWORD` mentioned in:
   - `ENV_STRUCTURE.md` - says it's stored in `.env`
   - `CLAUDE.md` - shows it in commands
   - `package.json` - references it in scripts
   - Various scripts expect it as environment variable

#### ✅ Solution:
For production database operations:
1. **Use GitHub Actions exclusively** for database migrations
2. **Never run production migrations locally**
3. **Use Supabase Dashboard** for manual operations if needed

### 5. Recommended Local Setup

Create `.env.local` for local development only:
```bash
# Local Supabase (Docker)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# These are safe - they're local Docker defaults
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 6. Production Access Patterns

#### Database Migrations
```bash
# NEVER do this locally:
# ❌ supabase db push --password $SUPABASE_DB_PASSWORD

# INSTEAD, use GitHub Actions:
# ✅ Push to main branch, migrations run automatically
# ✅ Or trigger manually: gh workflow run database-migration.yml
```

#### SMTP Configuration
```bash
# Configured via GitHub Actions, not manually
# Secrets stored in GitHub, applied via Management API
```

### 7. Implementation Plan

1. **Remove all references to local production passwords**
2. **Update documentation** to reflect GitHub Actions-only approach
3. **Create helper scripts** that check for proper environment
4. **Add pre-commit hooks** to prevent accidental secret commits

### 8. Emergency Access

If you absolutely need production access locally (not recommended):
1. Use Supabase Dashboard for database operations
2. Use GitHub Codespaces with secrets
3. Use a temporary `.env.production.local` (delete immediately after use)

### 9. Validation Script

Create a script to validate environment setup:
```bash
#!/bin/bash
# scripts/validate-env.sh

# Check no production secrets are present
if [ -f ".env" ]; then
    echo "❌ Production .env file found - this should not exist!"
    exit 1
fi

if env | grep -q "SUPABASE_DB_PASSWORD"; then
    echo "⚠️  Production database password in environment!"
    echo "This should only be in GitHub Secrets"
fi

echo "✅ Environment validation passed"
```

## Summary

The key principle: **Production secrets should never touch your local machine**. Use GitHub Actions for all production operations, and keep local development completely isolated with Docker-based Supabase.