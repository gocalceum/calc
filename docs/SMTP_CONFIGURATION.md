# SMTP Configuration via Environment Variables

This project uses Resend for SMTP email delivery, configured programmatically via GitHub Secrets instead of manual dashboard configuration.

## Required GitHub Secrets

Add these secrets to your GitHub repository:

1. **SUPABASE_ACCESS_TOKEN**
   - Get from: https://supabase.com/dashboard/account/tokens
   - Required for Management API access

2. **RESEND_API_KEY**
   - Get from: https://resend.com/api-keys
   - Your Resend API key (starts with `re_`)

3. **SUPABASE_SERVICE_KEY** (already configured)
   - Already in use for database migrations

## Setup Instructions

### 1. Create Resend Account
1. Sign up at https://resend.com
2. Verify your domain (calceum.com) or use their sandbox
3. Create an API key
4. Add the API key to GitHub Secrets as `RESEND_API_KEY`

### 2. Add GitHub Secrets
```bash
# Using GitHub CLI
gh secret set RESEND_API_KEY --body "re_your_api_key_here"

# Or via GitHub UI:
# Go to Settings > Secrets and variables > Actions
# Add RESEND_API_KEY with your Resend API key
```

### 3. Deploy SMTP Configuration
The SMTP settings are automatically configured when:
- The `configure-smtp.yml` workflow runs on push to main
- You manually trigger the workflow from GitHub Actions

To manually trigger:
```bash
gh workflow run configure-smtp.yml
```

### 4. Verify Configuration
Check if SMTP is properly configured:
```bash
# Run locally (requires SUPABASE_ACCESS_TOKEN env var)
./scripts/configure-smtp.sh

# Or check via GitHub Actions logs
gh run list --workflow=configure-smtp.yml
```

## Configuration Details

The following SMTP settings are applied:
- **Host**: smtp.resend.com
- **Port**: 587
- **Username**: resend
- **From Email**: noreply@calceum.com
- **Max Frequency**: 30 emails/hour (with custom SMTP)

## Rate Limits

- **Without Custom SMTP**: 2 emails per hour
- **With Custom SMTP**: 30 new users per hour
- **Password Reset**: Separate rate limit

## Testing

Test email delivery after configuration:
```bash
node scripts/test-email.js
```

## Troubleshooting

If emails are not sending:

1. **Check API Key**: Ensure RESEND_API_KEY is valid and starts with `re_`
2. **Verify Domain**: Domain must be verified in Resend dashboard
3. **Check Logs**: Review GitHub Actions logs for configuration errors
4. **Wait for Propagation**: Changes may take 5-10 minutes to take effect

## Local Development

For local development, emails are handled by the local Supabase instance (no SMTP required).

## Alternative: Manual Configuration

If you need to configure manually:
1. Go to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/settings/auth
2. Scroll to "SMTP Settings"
3. Enable "Custom SMTP" and enter Resend credentials

However, using environment variables is preferred for:
- Version control of configuration
- Automated deployment
- Security (no hardcoded credentials)
- Consistency across environments