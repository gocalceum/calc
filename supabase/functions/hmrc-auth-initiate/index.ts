// HMRC OAuth2 Authorization Initiation
// This function starts the OAuth2 flow by generating an authorization URL

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { HMRCClient } from '../hmrc-common/hmrc-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get auth header and verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request body
    const { entity_id, scopes = ['read:self-assessment', 'write:self-assessment'] } = await req.json()

    if (!entity_id) {
      throw new Error('entity_id is required')
    }

    // Verify user has access to this entity
    const { data: entityAccess, error: accessError } = await supabase
      .from('entity_permissions')
      .select('permission_level')
      .eq('entity_id', entity_id)
      .eq('user_id', user.id)
      .single()

    if (accessError && accessError.code !== 'PGRST116') {
      throw new Error('Error checking entity access')
    }

    // Check organization membership if no direct entity permission
    if (!entityAccess) {
      const { data: orgAccess, error: orgError } = await supabase
        .from('entities')
        .select(`
          organization_id,
          organizations!inner(
            organization_members!inner(
              user_id,
              role
            )
          )
        `)
        .eq('id', entity_id)
        .eq('organizations.organization_members.user_id', user.id)
        .single()

      if (orgError || !orgAccess) {
        throw new Error('You do not have access to this entity')
      }
    }

    // Determine redirect URI based on environment
    const isDev = Deno.env.get('NODE_ENV') === 'development'
    const redirectUri = isDev 
      ? (Deno.env.get('HMRC_REDIRECT_URI_DEV') || 'http://localhost:4011/self-assessment/callback')
      : (Deno.env.get('HMRC_REDIRECT_URI') || 'https://app.calceum.com/self-assessment/callback')

    // Generate OAuth state for CSRF protection
    const { data: stateData, error: stateError } = await supabase
      .rpc('create_oauth_state', {
        p_user_id: user.id,
        p_entity_id: entity_id,
        p_redirect_uri: redirectUri,
        p_scopes: scopes,
      })

    if (stateError || !stateData) {
      console.error('State creation error:', stateError)
      throw new Error('Failed to create OAuth state')
    }

    // Generate authorization URL
    const hmrcClient = new HMRCClient()
    const authUrl = hmrcClient.generateAuthUrl(stateData, scopes, redirectUri)

    // Log the initiation for audit
    await supabase
      .from('hmrc_audit_logs')
      .insert({
        user_id: user.id,
        operation: 'oauth_initiate',
        request_params: {
          entity_id,
          scopes,
        },
        response_status: 200,
        created_at: new Date().toISOString(),
      })

    return new Response(
      JSON.stringify({
        auth_url: authUrl,
        state: stateData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('OAuth initiation error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to initiate OAuth flow',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hmrc-auth-initiate' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"entity_id":"YOUR_ENTITY_ID","scopes":["read:self-assessment","write:self-assessment"]}'

*/