# Resend Email Configuration

## Overview
This application uses Resend for transactional email sending. Resend is integrated with both Supabase Auth and the custom server API.

## Configuration

### Environment Variables
Add these to your `.env` file:
```env
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Supabase Integration
Supabase Auth is configured to use Resend SMTP in `supabase/config.toml`:
- Host: smtp.resend.com
- Port: 465
- Authentication emails will be sent via Resend

## API Endpoints

### Test Configuration
```bash
GET /api/email/test
```
Returns the current Resend configuration status.

### Send Email
```bash
POST /api/email/send
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Hello from Calc App",
  "html": "<p>HTML content</p>",
  "text": "Plain text content"
}
```

## Usage Examples

### From Frontend (React)
```javascript
const sendEmail = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  const response = await fetch('http://localhost:4010/api/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({
      to: 'user@example.com',
      subject: 'Welcome to Calc App',
      html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
    })
  })
  
  const result = await response.json()
  console.log('Email sent:', result)
}
```

### Testing with cURL
```bash
# First, get an auth token (use your actual token)
TOKEN="your_supabase_auth_token"

# Send a test email
curl -X POST http://localhost:4010/api/email/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email from Calc App"
  }'
```

## Email Types

### Authentication Emails (Handled by Supabase)
- Sign up confirmation
- Password reset
- Magic link login
- Email change confirmation

### Custom Emails (Via Server API)
- Welcome emails
- Notifications
- Reports
- Any custom transactional emails

## Domain Verification

To send from your custom domain:
1. Go to https://resend.com/domains
2. Add your domain
3. Add the DNS records provided by Resend
4. Wait for verification (usually takes a few minutes)
5. Update `RESEND_FROM_EMAIL` to use your verified domain

## Rate Limits

Resend free tier includes:
- 3,000 emails/month
- 100 emails/day
- Rate limit: 10 requests/second

## Troubleshooting

### Email not sending
1. Check if `RESEND_API_KEY` is set correctly
2. Verify the sender email domain is verified in Resend
3. Check server logs for error messages
4. Test the configuration endpoint: `GET /api/email/test`

### Authentication emails not working
1. Ensure Supabase config has correct SMTP settings
2. Check if the Resend API key has SMTP access enabled
3. Verify the sender email matches your Resend configuration

## Security Notes
- Never expose your `RESEND_API_KEY` in client-side code
- Always validate email addresses before sending
- Implement rate limiting for email endpoints
- Use authentication to protect email sending endpoints