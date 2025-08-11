import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ducrwfvylwdaqpwfbdub.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y3J3ZnZ5bHdkYXFwd2ZiZHViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NTk2MTEsImV4cCI6MjA3MDQzNTYxMX0.Cp8xFY8gf_h1ifrP0nycCnRNlb7OWhK7qGQxK5CFWH8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('Testing OAuth providers...')
console.log('Supabase URL:', supabaseUrl)

// Test Google OAuth
const testGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:4011/',
      skipBrowserRedirect: true
    }
  })
  
  if (error) {
    console.log('❌ Google OAuth Error:', error.message)
  } else {
    console.log('✅ Google OAuth URL generated:', data.url ? 'Success' : 'Failed')
  }
}

// Test Microsoft OAuth
const testMicrosoft = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: 'http://localhost:4011/',
      skipBrowserRedirect: true,
      scopes: 'email'
    }
  })
  
  if (error) {
    console.log('❌ Microsoft OAuth Error:', error.message)
  } else {
    console.log('✅ Microsoft OAuth URL generated:', data.url ? 'Success' : 'Failed')
  }
}

await testGoogle()
await testMicrosoft()