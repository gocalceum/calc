# CI/CD & Deployment Plan

## Overview
Simplified CI/CD setup using GitHub Actions, AWS Amplify, and AWS Secrets Manager with preview deployments for PRs and automatic production deployment on merge to main.

## Architecture

### Components
- **Frontend Hosting**: AWS Amplify
- **Database**: Supabase Cloud (already deployed)
- **Secrets Management**: AWS Secrets Manager
- **CI/CD**: GitHub Actions
- **Domain**: app.calceum.com

### Deployment Flow
```
PR Created → GitHub Actions (checks) → Amplify Preview Deployment
     ↓
PR Merged → GitHub Actions → Amplify Production Deployment
```

## Implementation Plan

### Phase 1: AWS Setup

#### 1.1 AWS Secrets Manager
Create secret: `calc/production`
```json
{
  "supabase_url": "https://your-project.supabase.co",
  "supabase_anon_key": "your-anon-key",
  "supabase_service_key": "your-service-key",
  "google_client_id": "your-google-client-id",
  "google_client_secret": "your-google-secret",
  "apple_client_id": "your-apple-client-id",
  "apple_client_secret": "your-apple-secret",
  "resend_api_key": "your-resend-key",
  "sentry_dsn": "your-sentry-dsn"
}
```

#### 1.2 IAM Policy
Create IAM user `github-actions-calc` with policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": ["arn:aws:secretsmanager:us-east-1:*:secret:calc/production-*"]
    },
    {
      "Effect": "Allow",
      "Action": ["amplify:StartDeployment", "amplify:GetJob", "amplify:ListJobs"],
      "Resource": "arn:aws:amplify:us-east-1:*:apps/*/branches/*"
    }
  ]
}
```

### Phase 2: GitHub Configuration

#### 2.1 GitHub Secrets
Add to repository settings → Secrets and variables → Actions:
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret
- `AWS_REGION` - us-east-1 (or your region)
- `AMPLIFY_APP_ID` - From Amplify console
- `PREVIEW_SUPABASE_URL` - Read-only Supabase URL
- `PREVIEW_SUPABASE_ANON_KEY` - Read-only anon key

### Phase 3: Repository Files

#### 3.1 Files to Create
1. `.github/workflows/ci-cd.yml` - Main CI/CD workflow
2. `amplify.yml` - Amplify build configuration
3. `.github/workflows/database-migration.yml` - Manual DB migrations
4. `scripts/setup-local-secrets.sh` - Local development helper
5. `.env.example` - Environment template
6. `docs/DEPLOYMENT.md` - Deployment documentation

### Phase 4: Amplify Configuration

#### 4.1 Amplify Console Setup
1. Connect GitHub repository
2. Set build command: `bun run build`
3. Set output directory: `frontend/dist`
4. Enable PR previews
5. Configure custom domain: app.calceum.com

#### 4.2 Environment Variables
Set in Amplify Console:
- Enable IAM role with Secrets Manager access
- Configure build-time environment variables

## File Contents

### `.github/workflows/ci-cd.yml`
```yaml
name: CI/CD Pipeline

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  quality-checks:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.bun/install/cache
            node_modules
            frontend/node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
      
      - name: Install dependencies
        run: bun install
      
      - name: TypeScript check
        run: cd frontend && bun run type-check
      
      - name: ESLint
        run: cd frontend && bun run lint
      
      - name: Prettier check
        run: cd frontend && bun run format:check
      
      - name: Build verification
        run: cd frontend && bun run build

  deploy-production:
    name: Deploy to Production
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: quality-checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      
      - name: Trigger Amplify deployment
        run: |
          aws amplify start-deployment \
            --app-id ${{ secrets.AMPLIFY_APP_ID }} \
            --branch-name main \
            --source-url https://github.com/${{ github.repository }}/archive/${{ github.sha }}.zip
      
      - name: Wait for deployment
        run: |
          # Script to poll deployment status
          echo "Monitoring deployment..."
          # Add polling logic here
      
      - name: Notify deployment status
        if: always()
        run: |
          echo "Deployment ${{ job.status }}"
          # Add notification logic (Slack, Discord, etc.)
```

### `amplify.yml`
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - echo "Installing Bun..."
            - curl -fsSL https://bun.sh/install | bash
            - export BUN_INSTALL="$HOME/.bun"
            - export PATH="$BUN_INSTALL/bin:$PATH"
            
            # Fetch secrets for production builds only
            - |
              if [ "$AWS_BRANCH" = "main" ]; then
                echo "Fetching production secrets..."
                export SECRETS=$(aws secretsmanager get-secret-value --secret-id calc/production --query SecretString --output text)
                export VITE_SUPABASE_URL=$(echo $SECRETS | jq -r .supabase_url)
                export VITE_SUPABASE_ANON_KEY=$(echo $SECRETS | jq -r .supabase_anon_key)
              else
                echo "Using preview configuration..."
                export VITE_SUPABASE_URL=$PREVIEW_SUPABASE_URL
                export VITE_SUPABASE_ANON_KEY=$PREVIEW_SUPABASE_ANON_KEY
              fi
            
            - bun install
        build:
          commands:
            - bun run build
      artifacts:
        baseDirectory: frontend/dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - frontend/node_modules/**/*
          - ~/.bun/**/*
    appRoot: frontend
```

### `scripts/setup-local-secrets.sh`
```bash
#!/bin/bash
set -e

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is required but not installed."
    exit 1
fi

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed."
    exit 1
fi

echo "🔐 Fetching development secrets from AWS Secrets Manager..."

# Fetch secrets
SECRETS=$(aws secretsmanager get-secret-value \
  --secret-id calc/development \
  --query SecretString \
  --output text 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch secrets. Check your AWS credentials."
    exit 1
fi

# Write to .env.local
echo "$SECRETS" | jq -r 'to_entries[] | "VITE_\(.key | ascii_upcase)=\(.value)"' > .env.local

echo "✅ Secrets written to .env.local"
echo "📝 Remember: Never commit .env.local to git!"
```

### `.env.example`
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OAuth (configured in Supabase Dashboard)
# Google and Apple client IDs are public
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_APPLE_CLIENT_ID=your-apple-client-id

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false

# API Configuration
VITE_API_TIMEOUT=30000
VITE_API_RETRY_COUNT=3
```

## Package.json Scripts

Add to `frontend/package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css,md}\"",
    "test": "vitest",
    "test:ci": "vitest run --coverage"
  }
}
```

## Manual Steps Required

### Before Implementation
1. [ ] Create AWS IAM user with appropriate permissions
2. [ ] Set up AWS Secrets Manager with production secrets
3. [ ] Configure GitHub repository secrets
4. [ ] Set up Amplify app in AWS Console
5. [ ] Configure custom domain in Amplify

### After Implementation
1. [ ] Test PR preview deployment
2. [ ] Test production deployment
3. [ ] Verify secrets are accessible
4. [ ] Set up monitoring/alerts
5. [ ] Document rollback procedure

## Testing Plan

### 1. Local Testing
```bash
# Test secret fetching
./scripts/setup-local-secrets.sh

# Test build
cd frontend && bun run build

# Test CI checks
bun run type-check
bun run lint
bun run format:check
```

### 2. PR Testing
- Create test PR
- Verify GitHub Actions checks pass
- Verify Amplify preview deployment
- Test preview URL functionality

### 3. Production Testing
- Merge PR to main
- Verify automatic deployment
- Check production URL
- Verify all features work

## Rollback Procedure

### Quick Rollback
1. Revert commit in GitHub
2. Push to main (triggers redeploy)

### Manual Rollback
```bash
# Via Amplify Console
aws amplify start-deployment \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-id PREVIOUS_JOB_ID
```

## Monitoring

### Setup Monitoring For
- [ ] Deployment failures (GitHub Actions)
- [ ] Application errors (Sentry)
- [ ] Performance metrics (Vercel Analytics)
- [ ] Uptime monitoring (UptimeRobot)

## Cost Estimates

### Monthly Costs
- AWS Secrets Manager: ~$2 (5 secrets)
- AWS Amplify: ~$12 (build minutes + hosting)
- GitHub Actions: Free (public repo) or included in plan
- Total: ~$14/month

## Security Checklist

- [ ] Secrets never in code
- [ ] Different secrets per environment
- [ ] IAM least privilege
- [ ] Audit logging enabled
- [ ] SSL/TLS everywhere
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled

## Next Steps

1. Review and approve plan
2. Create AWS resources
3. Configure GitHub secrets
4. Create workflow files
5. Test deployment pipeline
6. Document any customizations

---

*Last Updated: January 2025*
*Version: 1.0*