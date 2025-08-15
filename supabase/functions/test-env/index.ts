import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const env = {
    HMRC_CLIENT_ID: Deno.env.get('HMRC_CLIENT_ID'),
    HMRC_CLIENT_SECRET: Deno.env.get('HMRC_CLIENT_SECRET') ? 'SET' : 'NOT SET',
    HMRC_API_BASE_URL: Deno.env.get('HMRC_API_BASE_URL'),
    HMRC_AUTH_BASE_URL: Deno.env.get('HMRC_AUTH_BASE_URL'),
    HMRC_REDIRECT_URI: Deno.env.get('HMRC_REDIRECT_URI'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT SET',
  }

  return new Response(JSON.stringify(env, null, 2), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})