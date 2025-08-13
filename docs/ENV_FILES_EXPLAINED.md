# Environment Files Explained

## Quick Summary

```
.env              ❌ NEVER CREATE THIS - Production secrets don't belong locally
.env.local        ✅ Your local development configuration (gitignored)
.env.example      ✅ Template showing required variables (tracked in git)
.env.local.example ✅ Template for local development (tracked in git)
```

## Detailed Explanation

### 1. `.env.local` (Your Local Development File)
**Status**: Should exist locally, NOT in git
**Purpose**: Contains configuration for local development with Docker Supabase
**Contents**: 
- Local Supabase URLs (http://localhost:54321)
- Default Docker credentials (safe, not real secrets)
- Local ports and settings

### 2. `.env.example` (Template for Documentation)
**Status**: Tracked in git
**Purpose**: Shows developers what environment variables the app needs
**Contents**: 
- Variable names with placeholder values
- Comments explaining each variable
- NO REAL SECRETS

### 3. `.env.local.example` (Local Development Template)
**Status**: Tracked in git  
**Purpose**: Ready-to-use template for local development
**Contents**:
- Actual local Docker Supabase values (safe defaults)
- Can be copied directly to `.env.local`

### 4. `.env` (PRODUCTION - DO NOT CREATE)
**Status**: Should NEVER exist locally
**Purpose**: Would contain production secrets
**Why it's dangerous**:
- Could accidentally expose production database passwords
- Could be committed to git by mistake
- Production credentials belong in:
  - GitHub Secrets (for CI/CD)
  - AWS Amplify environment variables (for frontend)
  - AWS Secrets Manager (for backend)

## Common Scenarios

### Starting Local Development
```bash
# Copy the local template
cp .env.local.example .env.local

# Start local Supabase
supabase start

# Run the app
cd frontend && bun run dev
```

### Need Production Values?
- **DON'T** create a `.env` file
- **DO** use GitHub Actions for database operations
- **DO** configure via web dashboards (Supabase, AWS Amplify)

### OAuth Configuration
- OAuth secrets should NOT be in environment files
- Configure OAuth in Supabase Dashboard:
  - Local: http://localhost:54323 > Authentication > Providers
  - Production: Supabase Dashboard > Your Project > Authentication > Providers

## Security Rules

1. **Never store production passwords locally**
2. **Never commit files starting with `.env` (except `.example` files)**
3. **Use GitHub Actions for all production database operations**
4. **Keep local and production completely separate**

## If You See `.env` File

If you accidentally create a `.env` file:
1. Delete it immediately: `rm .env`
2. Check it wasn't committed: `git status`
3. If committed, reset the commit before pushing
4. If already pushed, rotate all credentials immediately