// HMRC OAuth2 Callback Handler
// This function handles the OAuth2 callback and exchanges the code for tokens

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { HMRCClient } from '../hmrc-common/hmrc-client.ts'
import { encryptTokens, encryptSensitiveData } from '../hmrc-common/encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
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
    const body = await req.json()
    console.log('Received callback body:', body)
    const { code, state, error: oauthError } = body

    if (oauthError) {
      throw new Error(`OAuth error: ${oauthError}`)
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    // Validate OAuth state with idempotency check
    console.log('Validating OAuth state:', { state, userId: user.id })
    
    // First check if this state has already been processed
    const { data: existingAuth } = await supabase
      .from('hmrc_connections')
      .select('id, entity_id')
      .eq('oauth_state', state)
      .single()
    
    if (existingAuth) {
      console.log('OAuth state already processed, returning existing connection')
      return new Response(
        JSON.stringify({
          success: true,
          entity_id: existingAuth.entity_id,
          connections: [{ connection_id: existingAuth.id }],
          message: 'OAuth already processed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    const { data: stateData, error: stateError } = await supabase
      .rpc('validate_oauth_state', {
        p_state: state,
        p_user_id: user.id,
      })

    console.log('State validation result:', { stateData, stateError })
    if (stateError || !stateData || stateData.length === 0) {
      console.error('State validation error:', stateError)
      throw new Error('Invalid or expired OAuth state')
    }

    const { entity_id, scopes, redirect_uri } = stateData[0]

    // Determine redirect URI based on environment if not in state
    const isDev = Deno.env.get('NODE_ENV') === 'development'
    const finalRedirectUri = redirect_uri || (isDev 
      ? 'http://localhost:4011/self-assessment/callback'
      : 'https://app.calceum.com/self-assessment/callback')

    // Exchange code for tokens
    const hmrcClient = new HMRCClient()
    let tokens
    try {
      tokens = await hmrcClient.exchangeCodeForTokens(code, finalRedirectUri)
    } catch (error) {
      console.error('Token exchange error:', error)
      
      // Log failure
      await supabase
        .from('hmrc_audit_logs')
        .insert({
          user_id: user.id,
          operation: 'oauth_callback',
          endpoint: '/oauth/token',
          method: 'POST',
          response_status: 400,
          error_message: error.message,
          duration_ms: Date.now() - startTime,
          created_at: new Date().toISOString(),
        })
      
      throw new Error(`Token exchange failed: ${error.message}`)
    }

    // Encrypt tokens before storage
    const encryptedTokens = await encryptTokens(tokens)

    // List businesses for this user
    let businesses = []
    let userNino = null
    try {
      // First, we might need to get the NINO from the user's profile or from a test endpoint
      // For sandbox testing, we'll use the test NINO
      const businessResponse = await hmrcClient.listBusinesses(tokens.access_token)
      // HMRC API v2.0 returns 'listOfBusinesses' not 'businesses'
      businesses = businessResponse?.listOfBusinesses || businessResponse?.businesses || []
      
      // Extract NINO from the first business if available
      if (businesses.length > 0 && businesses[0].nino) {
        userNino = businesses[0].nino
      }
    } catch (error) {
      console.error('Failed to list businesses:', error)
      // Continue anyway - businesses can be synced later
    }

    // Store connections for each business
    const connections = []
    for (const business of businesses) {
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('hmrc_connections')
        .select('id')
        .eq('entity_id', entity_id)
        .eq('hmrc_business_id', business.businessId)
        .single()

      if (existingConnection) {
        // Update existing connection
        await supabase
          .from('hmrc_connections')
          .update({
            oauth_tokens: encryptedTokens,
            oauth_scopes: scopes,
            oauth_state: state, // Store state for idempotency
            sync_status: 'pending',
            connected_at: new Date().toISOString(),
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConnection.id)
        
        connections.push({ ...business, connection_id: existingConnection.id })
      } else {
        // Create new connection
        const businessData = await encryptSensitiveData({
          nino: business.nino,
          utr: business.utr,
        })

        // Map HMRC business type to our database enum
        const mapBusinessType = (hmrcType: string) => {
          const typeMap: Record<string, string> = {
            'self-employment': 'sole_trader',
            'uk-property': 'landlord',
            'foreign-property': 'landlord',
            'partnership': 'partnership',
            'limited-company': 'limited_company',
            'trust': 'trust',
          }
          return typeMap[hmrcType] || 'other'
        }
        
        const { data: newConnection, error: connectionError } = await supabase
          .rpc('create_hmrc_connection', {
            p_entity_id: entity_id,
            p_hmrc_business_id: business.businessId,
            p_business_type: mapBusinessType(business.typeOfBusiness),
            p_business_name: business.tradingName || business.businessId,
            p_nino: businessData.nino,
            p_utr: businessData.utr,
            p_vat_registration_number: business.vatRegistrationNumber,
            p_company_registration_number: business.companyRegistrationNumber,
            p_oauth_tokens: encryptedTokens,
            p_oauth_scopes: scopes,
            p_user_id: user.id,
          })

        if (connectionError) {
          console.error('Connection creation error:', connectionError)
          continue
        }

        connections.push({ ...business, connection_id: newConnection })
      }
    }

    // If no businesses found, create a placeholder connection
    if (businesses.length === 0) {
      const { data: placeholderConnection } = await supabase
        .rpc('create_hmrc_connection', {
          p_entity_id: entity_id,
          p_hmrc_business_id: 'PENDING_SYNC',
          p_business_type: 'other',
          p_business_name: 'Awaiting sync',
          p_nino: null,
          p_utr: null,
          p_vat_registration_number: null,
          p_company_registration_number: null,
          p_oauth_tokens: encryptedTokens,
          p_oauth_scopes: scopes,
          p_user_id: user.id,
        })

      connections.push({
        businessId: 'PENDING_SYNC',
        connection_id: placeholderConnection,
      })
    }

    // Log success
    await supabase
      .from('hmrc_audit_logs')
      .insert({
        user_id: user.id,
        operation: 'oauth_callback',
        endpoint: '/oauth/token',
        method: 'POST',
        request_params: { entity_id },
        response_status: 200,
        response_data: {
          businesses_connected: connections.length,
        },
        duration_ms: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })

    return new Response(
      JSON.stringify({
        success: true,
        entity_id,
        connections: connections.map(c => ({
          connection_id: c.connection_id,
          business_id: c.businessId || c.business_id,
          business_type: c.typeOfBusiness || c.business_type,
          business_name: c.tradingName || c.business_name,
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process OAuth callback',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start`
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hmrc-auth-callback' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"code":"AUTH_CODE_FROM_HMRC","state":"STATE_FROM_INITIATE"}'

*/
