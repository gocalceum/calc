#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ducrwfvylwdaqpwfbdub.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y3J3ZnZ5bHdkYXFwd2ZiZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTk2MTEsImV4cCI6MjA3MDQzNTYxMX0.Cp8xFY8gf_h1ifrP0nycCnRNlb7OWhK7qGQxK5CFWH8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function diagnoseSMTP() {
  console.log('=== SMTP Diagnosis ===\n')
  
  // Test 1: Check if we can reach the auth endpoint
  console.log('1. Testing auth endpoint connectivity...')
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    })
    const health = await response.json()
    console.log('   ✅ Auth endpoint is reachable')
    console.log('   Response:', JSON.stringify(health, null, 2))
  } catch (error) {
    console.log('   ❌ Auth endpoint error:', error.message)
  }
  
  console.log('\n2. Testing signup with detailed error handling...')
  const timestamp = Date.now()
  const testEmail = `smtp-test-${timestamp}@example.com`
  console.log(`   Email: ${testEmail}`)
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        emailRedirectTo: 'https://app.calceum.com/auth/confirm',
      },
    })
    
    if (error) {
      console.log('   ❌ Signup failed')
      console.log('   Error code:', error.status)
      console.log('   Error message:', error.message)
      console.log('   Full error:', JSON.stringify(error, null, 2))
      
      if (error.message.includes('rate limit')) {
        console.log('\n   📊 DIAGNOSIS: Rate limit is still being applied')
        console.log('   This means one of the following:')
        console.log('   1. Custom SMTP is not properly configured')
        console.log('   2. Custom SMTP settings not saved correctly')
        console.log('   3. Resend API key might be invalid')
        console.log('   4. SMTP configuration needs time to propagate')
      }
    } else {
      console.log('   ✅ Signup successful!')
      console.log('   User ID:', data.user?.id)
      console.log('   Email sent:', data.user?.email)
      console.log('   Confirmation required:', !data.user?.email_confirmed_at)
      
      if (data.user && !data.user.email_confirmed_at) {
        console.log('\n   📧 SUCCESS: Email should have been sent via custom SMTP')
      }
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message)
  }
  
  console.log('\n3. Checking for password reset (different rate limit)...')
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      `reset-test-${timestamp}@example.com`,
      { redirectTo: 'https://app.calceum.com/auth/reset-password' }
    )
    
    if (error) {
      console.log('   ❌ Password reset failed:', error.message)
    } else {
      console.log('   ✅ Password reset email queued')
    }
  } catch (err) {
    console.log('   ❌ Unexpected error:', err.message)
  }
  
  console.log('\n=== Recommendations ===')
  console.log('1. Check Supabase Dashboard > Settings > Auth > SMTP Settings')
  console.log('   URL: https://supabase.com/dashboard/project/ducrwfvylwdaqpwfbdub/settings/auth')
  console.log('2. Verify that "Enable Custom SMTP" is ON')
  console.log('3. Verify Resend credentials are correct:')
  console.log('   - Host: smtp.resend.com')
  console.log('   - Port: 587')
  console.log('   - Username: resend')
  console.log('   - Password: [Your Resend API Key]')
  console.log('4. Try clicking "Save" again even if settings look correct')
  console.log('5. Wait 5-10 minutes for changes to propagate')
}

diagnoseSMTP().catch(console.error)