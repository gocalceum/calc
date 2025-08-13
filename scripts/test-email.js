#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ducrwfvylwdaqpwfbdub.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y3J3ZnZ5bHdkYXFwd2ZiZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTk2MTEsImV4cCI6MjA3MDQzNTYxMX0.Cp8xFY8gf_h1ifrP0nycCnRNlb7OWhK7qGQxK5CFWH8'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testEmailDelivery() {
  console.log('Testing email delivery...')
  
  // Generate a unique test email
  const timestamp = Date.now()
  const testEmail = `test${timestamp}@example.com`
  
  console.log(`Attempting to sign up with email: ${testEmail}`)
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPassword123!',
    options: {
      emailRedirectTo: 'https://app.calceum.com/auth/confirm',
    },
  })
  
  if (error) {
    console.error('❌ Email delivery failed:', error.message)
    if (error.message.includes('rate limit')) {
      console.log('📊 Rate limit exceeded - this confirms the 2 emails/hour limit')
      console.log('🔧 Solution: Configure custom SMTP in Supabase Dashboard')
    }
    return
  }
  
  console.log('✅ Signup request successful')
  console.log('Response:', JSON.stringify(data, null, 2))
  
  if (data?.user?.identities?.length === 0) {
    console.log('⚠️  User created but email not sent (likely rate limited)')
  } else {
    console.log('📧 Email should have been sent (check inbox)')
  }
}

testEmailDelivery().catch(console.error)