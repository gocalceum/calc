import { createClient } from '@supabase/supabase-js'

const PORT = process.env.PORT || 4010

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

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
      return new Response('Calc Server API', {
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
    
    
    return Response.json({ error: 'Not Found' }, { status: 404, headers })
  }
})

console.log(`🚀 Server running at http://localhost:${server.port}`)
console.log(`🔗 Connected to: ${supabaseUrl}`)