#!/usr/bin/env bun

// Debug script for HMRC OAuth workflow
// This tests the OAuth flow and identifies the correct business list endpoint

const BASE_URL = 'https://test-api.service.hmrc.gov.uk'
const AUTH_BASE_URL = 'https://test-www.tax.service.gov.uk'

// Test credentials from environment
const CLIENT_ID = process.env.HMRC_CLIENT_ID || 'iQetMYZLL2Gq9dmqFTcJGSVMLpxZ'
const CLIENT_SECRET = process.env.HMRC_CLIENT_SECRET || '3ed60b21-3e72-409e-8fb2-d66a8edb0dc6'
const TEST_ACCESS_TOKEN = 'cf1ba15dbda4ed6ecb5d55dea9074e56' // From sandbox.bru
const TEST_NINO = 'NE101272A'

console.log('🔍 HMRC OAuth Debug Script')
console.log('=' .repeat(50))

// Test different business list endpoints
async function testBusinessListEndpoints() {
  console.log('\n📋 Testing Business List Endpoints:')
  
  const endpoints = [
    '/individuals/business/details',
    '/individuals/business/details/list',
    '/individuals/business/list',
    `/individuals/business/details/${TEST_NINO}`,
    '/business-details/list',
    '/organisations/business/details',
  ]
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint}`)
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${TEST_ACCESS_TOKEN}`,
          'Accept': 'application/vnd.hmrc.1.0+json',
        }
      })
      
      console.log(`  Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('  ✅ SUCCESS! Response:', JSON.stringify(data, null, 2))
        return endpoint // Return the working endpoint
      } else {
        const errorText = await response.text()
        console.log(`  ❌ Failed:`, errorText.substring(0, 100))
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  return null
}

// Test OAuth token exchange
async function testTokenExchange(code: string, redirectUri: string) {
  console.log('\n🔐 Testing Token Exchange:')
  console.log(`  Code: ${code}`)
  console.log(`  Redirect URI: ${redirectUri}`)
  
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
  })
  
  try {
    const response = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    
    console.log(`  Status: ${response.status}`)
    const data = await response.json()
    
    if (response.ok) {
      console.log('  ✅ Token Exchange Successful!')
      console.log('  Access Token:', data.access_token?.substring(0, 20) + '...')
      console.log('  Refresh Token:', data.refresh_token?.substring(0, 20) + '...')
      console.log('  Expires In:', data.expires_in)
      return data
    } else {
      console.log('  ❌ Token Exchange Failed:', data)
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message)
  }
  
  return null
}

// Test with a real access token
async function testWithRealToken(accessToken: string) {
  console.log('\n🔍 Testing with Real Access Token:')
  
  // Try the test-only endpoint
  const testEndpoint = '/test-only/individuals/business/details'
  console.log(`  Testing: ${testEndpoint}`)
  
  try {
    const response = await fetch(`${BASE_URL}${testEndpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.hmrc.1.0+json',
      }
    })
    
    console.log(`  Status: ${response.status}`)
    if (response.ok) {
      const data = await response.json()
      console.log('  ✅ Response:', JSON.stringify(data, null, 2))
    } else {
      const errorText = await response.text()
      console.log(`  ❌ Error:`, errorText)
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`)
  }
}

// Generate OAuth URL for manual testing
function generateOAuthUrl() {
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'read:self-assessment write:self-assessment',
    state: state,
    redirect_uri: 'http://localhost:4011/self-assessment/callback',
  })
  
  const url = `${AUTH_BASE_URL}/oauth/authorize?${params.toString()}`
  console.log('\n🔗 OAuth Authorization URL:')
  console.log(url)
  console.log('\nState:', state)
  return { url, state }
}

// Main execution
async function main() {
  // Test business list endpoints with sandbox token
  const workingEndpoint = await testBusinessListEndpoints()
  
  if (workingEndpoint) {
    console.log('\n✅ Found working endpoint:', workingEndpoint)
  } else {
    console.log('\n⚠️  No working business list endpoint found with sandbox token')
  }
  
  // Generate OAuth URL for manual testing
  const { url, state } = generateOAuthUrl()
  
  // If you have a code from the OAuth flow, uncomment and test:
  // const tokens = await testTokenExchange('YOUR_CODE_HERE', 'http://localhost:4011/self-assessment/callback')
  // if (tokens) {
  //   await testWithRealToken(tokens.access_token)
  // }
  
  console.log('\n' + '=' .repeat(50))
  console.log('📝 Recommendations:')
  console.log('1. The duplicate OAuth state error occurs when the callback is called twice')
  console.log('2. Implement idempotency in the callback handler')
  console.log('3. The correct business list endpoint needs to be determined from HMRC docs')
  console.log('4. Consider using the test-only endpoints for development')
}

main().catch(console.error)