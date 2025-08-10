import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const PORT = process.env.PORT || 4010

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const resendApiKey = process.env.RESEND_API_KEY
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

// Initialize Resend client if API key is provided
const resend = resendApiKey ? new Resend(resendApiKey) : null

// Create Supabase client with service key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    
    // Enable CORS
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers })
    }
    
    // Health check
    if (url.pathname === '/') {
      return new Response('Calc Server API - Using Supabase Native Features', {
        headers: { 'Content-Type': 'text/plain' }
      })
    }
    
    if (url.pathname === '/api/health') {
      return Response.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        supabase: 'connected'
      }, { headers })
    }
    
    // Get current user from auth header
    if (url.pathname === '/api/user' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return Response.json({ error: 'No authorization header' }, { status: 401, headers })
      }
      
      try {
        const token = authHeader.replace('Bearer ', '')
        
        // Verify the user's token
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
          return Response.json({ error: 'Invalid token' }, { status: 401, headers })
        }
        
        // Get user's profile using Supabase client
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        return Response.json({ 
          user,
          profile: profile || null
        }, { headers })
      } catch (error) {
        console.error('Error:', error)
        return Response.json({ error: 'Server error' }, { status: 500, headers })
      }
    }
    
    // Update user profile
    if (url.pathname === '/api/profile' && req.method === 'PUT') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return Response.json({ error: 'No authorization header' }, { status: 401, headers })
      }
      
      try {
        const token = authHeader.replace('Bearer ', '')
        const body = await req.json()
        
        // Verify the user's token
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
          return Response.json({ error: 'Invalid token' }, { status: 401, headers })
        }
        
        // Update profile using Supabase client
        const { data: profile, error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            ...body,
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (updateError) {
          return Response.json({ error: updateError.message }, { status: 400, headers })
        }
        
        return Response.json({ profile }, { headers })
      } catch (error) {
        console.error('Error:', error)
        return Response.json({ error: 'Server error' }, { status: 500, headers })
      }
    }
    
    // Get all profiles (admin only - using service key)
    if (url.pathname === '/api/admin/profiles' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return Response.json({ error: 'No authorization header' }, { status: 401, headers })
      }
      
      try {
        // For admin endpoints, you might want to check if user has admin role
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
          return Response.json({ error: 'Invalid token' }, { status: 401, headers })
        }
        
        // Get all profiles using service key (bypasses RLS)
        const { data: profiles, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .order('updated_at', { ascending: false })
        
        if (fetchError) {
          return Response.json({ error: fetchError.message }, { status: 400, headers })
        }
        
        return Response.json({ profiles }, { headers })
      } catch (error) {
        console.error('Error:', error)
        return Response.json({ error: 'Server error' }, { status: 500, headers })
      }
    }
    
    // Supabase Realtime subscription info
    if (url.pathname === '/api/realtime/info' && req.method === 'GET') {
      return Response.json({
        message: 'Use Supabase Realtime directly from the client',
        example: `
          const channel = supabase
            .channel('profiles-changes')
            .on('postgres_changes', 
              { event: '*', schema: 'public', table: 'profiles' },
              (payload) => console.log('Change:', payload)
            )
            .subscribe()
        `
      }, { headers })
    }
    
    // Send email using Resend
    if (url.pathname === '/api/email/send' && req.method === 'POST') {
      if (!resend) {
        return Response.json({ 
          error: 'Email service not configured. Please set RESEND_API_KEY in environment variables.' 
        }, { status: 503, headers })
      }
      
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return Response.json({ error: 'No authorization header' }, { status: 401, headers })
      }
      
      try {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error } = await supabase.auth.getUser(token)
        
        if (error || !user) {
          return Response.json({ error: 'Invalid token' }, { status: 401, headers })
        }
        
        const body = await req.json()
        const { to, subject, html, text } = body
        
        if (!to || !subject || (!html && !text)) {
          return Response.json({ 
            error: 'Missing required fields: to, subject, and either html or text' 
          }, { status: 400, headers })
        }
        
        const { data, error: sendError } = await resend.emails.send({
          from: resendFromEmail,
          to: [to],
          subject,
          html: html || undefined,
          text: text || undefined,
        })
        
        if (sendError) {
          return Response.json({ error: sendError.message }, { status: 400, headers })
        }
        
        return Response.json({ 
          success: true,
          emailId: data?.id,
          message: 'Email sent successfully'
        }, { headers })
      } catch (error) {
        console.error('Error sending email:', error)
        return Response.json({ error: 'Failed to send email' }, { status: 500, headers })
      }
    }
    
    // Test Resend configuration
    if (url.pathname === '/api/email/test' && req.method === 'GET') {
      return Response.json({
        configured: !!resend,
        fromEmail: resendFromEmail,
        message: resend 
          ? 'Resend is configured and ready to send emails' 
          : 'Resend is not configured. Please add RESEND_API_KEY to your environment variables.'
      }, { headers })
    }
    
    return Response.json({ error: 'Not Found' }, { status: 404, headers })
  }
})

console.log(`🚀 Server running at http://localhost:${server.port}`)
console.log(`📦 Using Supabase Native Features`)
console.log(`🔗 Connected to: ${supabaseUrl}`)
console.log(`📧 Resend: ${resend ? 'Configured' : 'Not configured (set RESEND_API_KEY)'}`)