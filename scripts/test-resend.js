#!/usr/bin/env node

// Test Resend email sending
// Usage: node scripts/test-resend.js recipient@example.com

const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('Usage: node scripts/test-resend.js recipient@example.com');
  process.exit(1);
}

async function testResend() {
  try {
    // First, check if Resend is configured
    const testResponse = await fetch('http://localhost:4010/api/email/test');
    const testResult = await testResponse.json();
    
    console.log('Resend Configuration:', testResult);
    
    if (!testResult.configured) {
      console.error('❌ Resend is not configured. Please set RESEND_API_KEY in your .env file');
      return;
    }
    
    // For testing, we'll use a simple approach without auth
    // In production, you'd need to authenticate first
    console.log(`\n📧 Sending test email to: ${recipientEmail}`);
    console.log('From:', testResult.fromEmail);
    
    // Note: This endpoint requires authentication
    // You'll need to sign in first to get a token
    console.log('\n⚠️  Note: The /api/email/send endpoint requires authentication.');
    console.log('To test email sending:');
    console.log('1. Sign in to the app at http://localhost:4011');
    console.log('2. Get your auth token from browser DevTools');
    console.log('3. Run the curl command with your token:');
    console.log(`
curl -X POST http://localhost:4010/api/email/send \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "${recipientEmail}",
    "subject": "Test Email from Calc App",
    "html": "<h2>Hello from Calc App!</h2><p>This is a test email sent via Resend.</p><p>If you received this, your email configuration is working correctly!</p>",
    "text": "Hello from Calc App! This is a test email sent via Resend."
  }'
    `);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testResend();