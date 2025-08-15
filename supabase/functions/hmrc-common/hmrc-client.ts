// HMRC API Client utilities
import { HMRCConfig, HMRCError, OAuthTokens } from './types.ts'

export class HMRCClient {
  private config: HMRCConfig

  constructor() {
    this.config = {
      clientId: Deno.env.get('HMRC_CLIENT_ID') || '',
      clientSecret: Deno.env.get('HMRC_CLIENT_SECRET') || '',
      baseUrl: Deno.env.get('HMRC_API_BASE_URL') || 'https://test-api.service.hmrc.gov.uk',
      redirectUri: Deno.env.get('HMRC_REDIRECT_URI') || '',
    }
  }

  // Generate OAuth2 authorization URL
  generateAuthUrl(state: string, scopes: string[], redirectUri?: string): string {
    const authBaseUrl = Deno.env.get('HMRC_AUTH_BASE_URL') || 'https://test-www.tax.service.gov.uk'
    
    // Use provided redirectUri or fall back to config
    const finalRedirectUri = redirectUri || this.config.redirectUri
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: scopes.join(' '),
      state: state,
      redirect_uri: finalRedirectUri,
    })
    
    return `${authBaseUrl}/oauth/authorize?${params.toString()}`
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, redirectUri?: string): Promise<OAuthTokens> {
    const tokenUrl = `${this.config.baseUrl}/oauth/token`
    
    // Use provided redirectUri or fall back to config
    const finalRedirectUri = redirectUri || this.config.redirectUri
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: finalRedirectUri,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
    }

    const tokens = await response.json()
    
    // Calculate expires_at timestamp
    const expiresAt = Date.now() + (tokens.expires_in * 1000)
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokens.token_type,
      scope: tokens.scope,
    }
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const tokenUrl = `${this.config.baseUrl}/oauth/token`
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
    }

    const tokens = await response.json()
    
    // Calculate expires_at timestamp
    const expiresAt = Date.now() + (tokens.expires_in * 1000)
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      token_type: tokens.token_type,
      scope: tokens.scope,
    }
  }

  // Make authenticated API request
  async makeRequest(
    endpoint: string,
    method: string = 'GET',
    accessToken: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.hmrc.1.0+json',
      ...headers,
    }

    if (body && method !== 'GET') {
      requestHeaders['Content-Type'] = 'application/json'
    }

    const options: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)

    const responseData = await response.text()
    let parsedData: any

    try {
      parsedData = responseData ? JSON.parse(responseData) : null
    } catch {
      parsedData = responseData
    }

    if (!response.ok) {
      const error: HMRCError = {
        code: response.status.toString(),
        message: parsedData?.message || `Request failed with status ${response.status}`,
        errors: parsedData?.errors,
      }
      throw error
    }

    return parsedData
  }

  // List all businesses for a user
  async listBusinesses(accessToken: string, nino?: string): Promise<any> {
    // For test environment, we need the NINO to list businesses
    // In production, this would come from the authenticated user's context
    const testNino = nino || 'NE101272A' // Default test NINO for sandbox
    console.log('Listing businesses for NINO:', testNino)
    
    const result = await this.makeRequest(
      `/individuals/business/details/${testNino}/list`,
      'GET',
      accessToken,
      undefined,
      { 'Accept': 'application/vnd.hmrc.2.0+json' } // Business Details API v2.0
    )
    
    console.log('Business list API result:', JSON.stringify(result))
    return result
  }

  // Get business details
  async getBusinessDetails(accessToken: string, nino: string, businessId: string): Promise<any> {
    return this.makeRequest(
      `/individuals/business/details/${nino}/${businessId}`,
      'GET',
      accessToken,
      undefined,
      { 'Accept': 'application/vnd.hmrc.2.0+json' } // Business Details API v2.0
    )
  }

  // Get obligations (tax deadlines and requirements)
  async getObligations(
    accessToken: string,
    nino: string,
    businessId: string,
    typeOfObligation: string = 'income-and-expenditure',
    fromDate?: string,
    toDate?: string
  ): Promise<any> {
    const params = new URLSearchParams()
    if (fromDate) params.append('from', fromDate)
    if (toDate) params.append('to', toDate)
    
    const queryString = params.toString()
    // Obligations API endpoint pattern for income-and-expenditure
    const endpoint = `/obligations/details/NINO/${nino}/${typeOfObligation}${queryString ? `?${queryString}` : ''}`
    
    return this.makeRequest(
      endpoint, 
      'GET', 
      accessToken,
      undefined,
      { 'Accept': 'application/vnd.hmrc.2.0+json' } // Obligations API v2.0
    )
  }

  // Validate fraud prevention headers
  generateFraudPreventionHeaders(userAgent: string, ipAddress?: string): Record<string, string> {
    // These are required fraud prevention headers for HMRC APIs
    // In production, these should be properly collected from the client
    return {
      'Gov-Client-Connection-Method': 'WEB_APP_VIA_SERVER',
      'Gov-Client-Device-ID': 'device-id-placeholder', // Should be persistent device ID
      'Gov-Client-User-IDs': 'calceum-user',
      'Gov-Client-Timezone': 'UTC+00:00',
      'Gov-Client-Window-Size': 'width=1920&height=1080',
      'Gov-Client-Browser-JS-User-Agent': userAgent,
      'Gov-Client-Browser-Plugins': 'none',
      'Gov-Client-Browser-Do-Not-Track': 'false',
      'Gov-Client-Screens': 'width=1920&height=1080&colour-depth=24',
      'Gov-Client-Multi-Factor': 'type=AUTH_CODE',
      'Gov-Vendor-Version': 'calceum=1.0.0',
      'Gov-Vendor-License-IDs': 'calceum-license',
    }
  }
}