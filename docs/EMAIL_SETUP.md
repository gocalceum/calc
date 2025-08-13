# Email Configuration for Calceum Production

## Current Issue
Supabase free tier has strict email rate limits (**2 emails per hour**) which is insufficient for production use.

**Rate Limit Error**: "email rate limit exceeded" - This occurs after sending 2 emails within an hour.

## Solutions

### Option 1: Configure Custom SMTP (Recommended for Production)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/settings/auth
   - Scroll to "SMTP Settings"

2. **Use a Production Email Service**

   **Option A: Resend (Recommended - Easy Setup)**
   ```
   - Sign up at: https://resend.com
   - Create API key
   - SMTP Settings:
     Host: smtp.resend.com
     Port: 465 (SSL) or 587 (TLS)
     Username: resend
     Password: [Your API Key]
     From Email: noreply@yourdomain.com
   ```

   **Option B: SendGrid**
   ```
   - Sign up at: https://sendgrid.com
   - Create API key
   - SMTP Settings:
     Host: smtp.sendgrid.net
     Port: 587
     Username: apikey
     Password: [Your API Key]
     From Email: noreply@yourdomain.com
   ```

   **Option C: AWS SES**
   ```
   - Configure in AWS Console
   - SMTP Settings:
     Host: email-smtp.[region].amazonaws.com
     Port: 587
     Username: [SMTP Username]
     Password: [SMTP Password]
     From Email: noreply@yourdomain.com
   ```

3. **Configure in Supabase Dashboard**
   - Enable "Custom SMTP" in Auth settings
   - Enter your SMTP credentials
   - Set sender name and email
   - Save settings

### Option 2: Disable Email Confirmation (Development Only)

1. **In Supabase Dashboard**:
   - Go to Authentication > Providers > Email
   - Disable "Confirm email" toggle
   - Save

2. **Update your signup flow** to auto-confirm users (NOT recommended for production)

### Option 3: Use Magic Links Instead

1. **Update Login Component**:
```typescript
// Instead of signInWithPassword
const { error } = await supabase.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: 'https://app.calceum.com/auth/callback',
  },
})
```

## Testing Email Configuration

1. **Check Email Logs**:
   - Go to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/auth/logs
   - Look for email sending errors

2. **Test with Different Email**:
   - Try signing up with a different email address
   - Check spam folder

3. **Verify Rate Limits**:
   - Free tier: **2 emails per hour** (confirmed)
   - Pro tier: Higher limits with custom SMTP
   - Error message: "email rate limit exceeded"

## Environment Variables for Custom Email

Add to your production environment:

```env
# If using Resend
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxxx
SMTP_FROM=noreply@calceum.com

# Email templates (optional)
EMAIL_CONFIRM_SUBJECT="Confirm your Calceum account"
EMAIL_RESET_SUBJECT="Reset your Calceum password"
```

## Quick Fix for Testing

For immediate testing, you can:

1. **Use Supabase Dashboard to manually confirm users**:
   - Go to Authentication > Users
   - Find the user
   - Click "Confirm email" manually

2. **Check Auth Logs**:
   - Go to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/auth/logs
   - See if emails are being attempted

## Recommended Action

### Immediate Solution (for Production)

1. **Sign up for Resend** (recommended)
   - Go to: https://resend.com
   - Create a free account (3000 emails/month free)
   - Generate an API key

2. **Configure in Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/settings/auth
   - Scroll to "SMTP Settings"
   - Enable "Custom SMTP"
   - Enter:
     ```
     Host: smtp.resend.com
     Port: 587
     Username: resend
     Password: [Your Resend API Key]
     Sender email: noreply@calceum.com
     Sender name: Calceum
     ```
   - Save settings

3. **Test with a new user signup**
   - Run: `node scripts/test-email.js`
   - Or sign up with a new email address

This will resolve the email delivery issues in production.

## Alternative: Temporary Workaround

While setting up SMTP:
1. Wait 1 hour for rate limit to reset
2. Manually confirm users in Supabase Dashboard:
   - Go to Authentication > Users
   - Click on the user
   - Click "Confirm email"