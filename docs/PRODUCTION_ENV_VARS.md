# Production Environment Variables

## What Goes Where

### Frontend (AWS Amplify)
These are configured in AWS Amplify Console > App Settings > Environment Variables:

```env
VITE_SUPABASE_URL=https://ducrwfvylwdaqpwfbdub.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....[your production anon key]
```

**Note**: The anon key is PUBLIC (it's safe in frontend code), but we still configure it via environment variables for:
- Easy updates without code changes
- Environment-specific configuration
- Consistency across deployments

### Backend/CI/CD (GitHub Secrets)
These are PRIVATE and must NEVER be exposed:

```env
SUPABASE_ACCESS_TOKEN=[Management API token]
SUPABASE_DB_PASSWORD=[Database password]
SUPABASE_SERVICE_KEY=[Service role key - PRIVATE!]
RESEND_API_KEY=[Email service key]
```

## Key Security Points

### PUBLIC (Safe to expose, but still environment-specific):
- `VITE_SUPABASE_URL` - Your project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous/public key for frontend

### PRIVATE (NEVER expose):
- `SUPABASE_SERVICE_KEY` - Admin access to everything
- `SUPABASE_DB_PASSWORD` - Direct database access
- Any API keys for services (Resend, etc.)

## How to Configure Production

### 1. AWS Amplify (Frontend)
1. Go to AWS Amplify Console
2. Select your app
3. Go to "App settings" > "Environment variables"
4. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### 2. GitHub Secrets (CI/CD)
Already configured:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `RESEND_API_KEY`

### 3. Local Development
Never needs production values! Use Docker Supabase:
- URL: `http://localhost:54321`
- Anon Key: Docker default (same for everyone)

## Common Confusion

**Q: If the anon key is public, why not commit it?**

A: While it's safe to expose, we don't commit it because:
1. Different environments need different keys
2. Keys might need rotation
3. Keeps a clear boundary between environments
4. Follows the principle of configuration over code

**Q: Can I test with production Supabase locally?**

A: Technically yes (the anon key is public), but DON'T:
1. Risk of affecting real data
2. Breaks the local/production separation
3. Local Docker Supabase is free and safe

## Summary

- **Anon key**: Public but environment-specific
- **Service key**: Private, never expose
- **Local**: Always use Docker Supabase
- **Production**: Configure via AWS Amplify UI