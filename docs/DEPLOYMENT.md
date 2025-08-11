# Deployment Guide

## Overview

This application uses a CI/CD pipeline with GitHub Actions and AWS Amplify for automated deployments.

- **Frontend**: Hosted on AWS Amplify
- **Database**: Supabase Cloud
- **Secrets**: AWS Secrets Manager (eu-west-2)
- **Domain**: app.calceum.com

## Architecture

```
GitHub Repository
    ├── Pull Request → GitHub Actions → Amplify Preview
    └── Merge to main → GitHub Actions → Amplify Production → app.calceum.com
```

## Deployment Flow

### 1. Development
- Work on feature branches
- Local testing with `bun run dev`
- Uses local Supabase or development secrets

### 2. Pull Request
- Create PR against `main` branch
- GitHub Actions runs quality checks:
  - TypeScript compilation
  - ESLint
  - Prettier
  - Build verification
- Amplify creates preview deployment (if configured)

### 3. Production Deployment
- Merge PR to `main` branch
- GitHub Actions triggers production deployment
- Amplify builds and deploys to app.calceum.com
- Secrets fetched from AWS Secrets Manager

## Manual Deployment

### Deploy from CLI

```bash
# Trigger Amplify deployment
aws amplify start-deployment \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-2
```

### Force Rebuild

In Amplify Console:
1. Go to your app
2. Select the branch
3. Click "Redeploy this version"

## Secrets Management

### Production Secrets Location
All production secrets are stored in AWS Secrets Manager (eu-west-2):
- `calceum/supabase` - Supabase configuration
- `calceum/oauth/google` - Google OAuth (if needed)
- `calceum/app-config` - Application configuration

### Update Secrets

```bash
# Update Supabase secrets
aws secretsmanager update-secret \
  --secret-id calceum/supabase \
  --secret-string '{"supabase_url":"...","supabase_anon_key":"..."}' \
  --region eu-west-2
```

### Local Development Secrets

```bash
# Fetch secrets for local development
./scripts/setup-local-secrets.sh
```

## Environment Variables

### Required in Amplify Console
Set these in Amplify Console → App Settings → Environment Variables:

```
# If not using Secrets Manager
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# For preview deployments
PREVIEW_SUPABASE_URL=https://your-project.supabase.co
PREVIEW_SUPABASE_ANON_KEY=your-anon-key
```

### Required GitHub Secrets
Set in GitHub → Settings → Secrets and variables → Actions:

```
AWS_ACCESS_KEY_ID       # IAM user access key
AWS_SECRET_ACCESS_KEY   # IAM user secret
AMPLIFY_APP_ID         # From Amplify console (optional)
```

## Monitoring Deployments

### GitHub Actions
- Check workflow runs: Actions tab in GitHub
- View logs for each step
- Re-run failed jobs if needed

### Amplify Console
- Monitor build logs
- View deployment history
- Access preview URLs
- Check custom domain status

### CloudWatch Logs
Amplify logs are available in CloudWatch:
```bash
aws logs tail /aws/amplify/YOUR_APP_ID --follow
```

## Rollback Procedures

### Quick Rollback (Recommended)
1. Revert the problematic commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. This triggers a new deployment with the previous code

### Manual Rollback in Amplify
1. Go to Amplify Console
2. Select your app and branch
3. Go to "Activity" tab
4. Find the last working deployment
5. Click "Redeploy this version"

### Emergency Rollback
```bash
# Get previous successful job ID
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --max-items 10 \
  --region eu-west-2

# Redeploy specific version
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-id PREVIOUS_JOB_ID \
  --job-type RELEASE \
  --region eu-west-2
```

## Troubleshooting

### Build Failures

#### Check Amplify logs
```bash
aws amplify get-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-id JOB_ID \
  --region eu-west-2
```

#### Common issues:
1. **Missing dependencies**: Check `package.json` and `bun.lockb`
2. **TypeScript errors**: Run `bun run type-check` locally
3. **Build timeout**: Increase timeout in Amplify settings
4. **Memory issues**: Increase compute type in Amplify

### Secret Access Issues

#### Verify secret exists
```bash
aws secretsmanager describe-secret \
  --secret-id calceum/supabase \
  --region eu-west-2
```

#### Check IAM permissions
Ensure Amplify service role has:
- `secretsmanager:GetSecretValue` permission
- Access to `calceum/*` secrets

### Domain Issues

#### DNS not resolving
1. Check Route 53 or your DNS provider
2. Verify CNAME records point to Amplify
3. Wait for DNS propagation (up to 48 hours)

#### SSL Certificate Issues
1. Check certificate status in Amplify Console
2. Ensure domain ownership verification completed
3. Re-request certificate if expired

## Performance Optimization

### Build Optimization
- Use `bun install --frozen-lockfile` for faster installs
- Enable Amplify build caching
- Minimize build artifacts

### Frontend Optimization
- Enable Amplify performance mode
- Use CloudFront caching
- Implement code splitting
- Optimize images and assets

## Security Checklist

- [ ] Secrets never committed to repository
- [ ] Different secrets for each environment
- [ ] IAM roles follow least privilege
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers configured in Amplify
- [ ] CORS properly configured
- [ ] Regular secret rotation schedule
- [ ] Audit logging enabled

## Useful Commands

```bash
# View current deployment status
aws amplify get-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-2

# List recent deployments
aws amplify list-jobs \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-2

# Get Amplify app details
aws amplify get-app \
  --app-id YOUR_APP_ID \
  --region eu-west-2

# Trigger manual deployment
aws amplify start-deployment \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --region eu-west-2
```

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Check Amplify Console logs
3. Review CloudWatch logs
4. Check AWS Service Health Dashboard
5. Contact team lead or DevOps

---

Last Updated: January 2025