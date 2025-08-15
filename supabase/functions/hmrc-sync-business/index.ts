// HMRC Business Sync Function
// Syncs business details from HMRC for a given connection

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { HMRCClient } from '../hmrc-common/hmrc-client.ts'
import { decryptTokens, encryptSensitiveData } from '../hmrc-common/encryption.ts'

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
    const { connection_id } = await req.json()

    if (!connection_id) {
      throw new Error('connection_id is required')
    }

    // Get connection details
    const { data: connection, error: connectionError } = await supabase
      .from('hmrc_connections')
      .select('*')
      .eq('id', connection_id)
      .single()

    if (connectionError || !connection) {
      throw new Error('Connection not found')
    }

    // Verify user has access to this connection
    const { data: entityAccess } = await supabase
      .from('entity_permissions')
      .select('permission_level')
      .eq('entity_id', connection.entity_id)
      .eq('user_id', user.id)
      .single()

    if (!entityAccess) {
      // Check organization membership
      const { data: orgAccess } = await supabase
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
        .eq('id', connection.entity_id)
        .eq('organizations.organization_members.user_id', user.id)
        .single()

      if (!orgAccess) {
        throw new Error('You do not have access to this connection')
      }
    }

    // Decrypt tokens
    const tokens = await decryptTokens(connection.oauth_tokens)

    // Initialize HMRC client and list businesses
    const hmrcClient = new HMRCClient()
    let businesses = []
    
    try {
      // For test environment, we need to use the test NINO
      const businessResponse = await hmrcClient.listBusinesses(tokens.access_token)
      console.log('Business API response:', JSON.stringify(businessResponse))
      // HMRC API v2.0 returns 'listOfBusinesses' not 'businesses'
      businesses = businessResponse?.listOfBusinesses || businessResponse?.businesses || []
      console.log('Listed businesses:', businesses.length)
    } catch (error) {
      console.error('Failed to list businesses:', error)
      
      // Update connection with sync error
      await supabase
        .from('hmrc_connections')
        .update({
          last_sync_error: error.message,
          last_sync_at: new Date().toISOString(),
          sync_status: 'error',
        })
        .eq('id', connection_id)
      
      throw new Error(`Failed to list businesses: ${error.message}`)
    }

    // Update or create business records
    if (businesses.length > 0) {
      // Update the primary connection with first business details
      const primaryBusiness = businesses[0]
      console.log('Updating connection with business:', primaryBusiness)
      
      // Only encrypt if we have the data
      let encryptedNino = null
      let encryptedUtr = null
      if (primaryBusiness.nino || primaryBusiness.utr) {
        const businessData = await encryptSensitiveData({
          nino: primaryBusiness.nino || null,
          utr: primaryBusiness.utr || null,
        })
        encryptedNino = businessData.nino
        encryptedUtr = businessData.utr
      }

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
      
      const { error: updateError } = await supabase
        .from('hmrc_connections')
        .update({
          hmrc_business_id: primaryBusiness.businessId,
          business_type: mapBusinessType(primaryBusiness.typeOfBusiness),
          business_name: primaryBusiness.tradingName || primaryBusiness.businessId,
          nino: encryptedNino,
          utr: encryptedUtr,
          vat_registration_number: primaryBusiness.vatRegistrationNumber || null,
          company_registration_number: primaryBusiness.companyRegistrationNumber || null,
          business_details: primaryBusiness,
          last_sync_at: new Date().toISOString(),
          sync_status: 'completed',
          last_sync_error: null,
        })
        .eq('id', connection_id)
      
      if (updateError) {
        console.error('Failed to update connection:', updateError)
        throw new Error(`Failed to update connection: ${updateError.message}`)
      }
      
      console.log('Connection updated successfully')

      // Fetch additional business details
      try {
        console.log('Fetching additional business details...')
        
        // 1. Get detailed business information
        const detailsResponse = await hmrcClient.getBusinessDetails(
          tokens.access_token,
          'NE101272A', // Test NINO for sandbox
          primaryBusiness.businessId
        )
        console.log('Business details:', JSON.stringify(detailsResponse))
        
        // 2. Get obligations (tax deadlines)
        const obligationsResponse = await hmrcClient.getObligations(
          tokens.access_token,
          'NE101272A',
          primaryBusiness.businessId,
          'income-and-expenditure',
          new Date(new Date().getFullYear() - 1, 0, 1).toISOString().split('T')[0], // From start of last year
          new Date().toISOString().split('T')[0] // To today
        )
        console.log('Obligations:', JSON.stringify(obligationsResponse))
        
        // Update connection with additional details
        await supabase
          .from('hmrc_connections')
          .update({
            business_details: {
              ...primaryBusiness,
              ...detailsResponse,
            },
            obligations: obligationsResponse?.obligations || [],
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection_id)
          
        console.log('Additional details updated successfully')
      } catch (detailsError) {
        console.error('Failed to fetch additional details:', detailsError)
        // Non-critical error - continue
      }

      // TODO: Handle multiple businesses - create additional connections if needed
      if (businesses.length > 1) {
        console.log(`Found ${businesses.length} businesses, additional businesses need to be handled`)
      }
    } else {
      // No businesses found, update sync status
      await supabase
        .from('hmrc_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: 'completed',
          last_sync_error: 'No businesses found',
        })
        .eq('id', connection_id)
    }

    // Log success
    await supabase
      .from('hmrc_audit_logs')
      .insert({
        user_id: user.id,
        operation: 'sync_business',
        endpoint: '/individuals/business/details/list',
        method: 'GET',
        request_params: { connection_id },
        response_status: 200,
        response_data: {
          businesses_found: businesses.length,
        },
        duration_ms: Date.now() - startTime,
        created_at: new Date().toISOString(),
      })

    return new Response(
      JSON.stringify({
        success: true,
        businesses_synced: businesses.length,
        connection_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Business sync error:', error)
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to sync businesses',
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/hmrc-sync-business' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"connection_id":"CONNECTION_ID"}'

*/