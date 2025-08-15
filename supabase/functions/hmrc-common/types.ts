// HMRC API Type Definitions

export interface HMRCConfig {
  clientId: string
  clientSecret: string
  baseUrl: string
  redirectUri: string
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  token_type: string
  scope?: string
}

export interface HMRCBusiness {
  businessId: string
  typeOfBusiness: 'sole-trader' | 'partnership' | 'limited-company' | 'llp' | 'trust' | 'other'
  tradingName?: string
  firstAccountingPeriodStartDate?: string
  firstAccountingPeriodEndDate?: string
  latestAccountingPeriodStartDate?: string
  latestAccountingPeriodEndDate?: string
  taxSolvencyStatus?: 'solvent' | 'insolvent'
}

export interface HMRCBusinessDetails {
  businessId: string
  typeOfBusiness: string
  tradingName?: string
  businessAddressDetails?: {
    addressLine1?: string
    addressLine2?: string
    addressLine3?: string
    addressLine4?: string
    postalCode?: string
    countryCode?: string
  }
  businessContactDetails?: {
    phoneNumber?: string
    mobileNumber?: string
    faxNumber?: string
    emailAddress?: string
  }
  commencementDate?: string
  cessationDate?: string
  accountingPeriods?: Array<{
    accountingPeriodStartDate: string
    accountingPeriodEndDate: string
  }>
}

export interface HMRCObligation {
  businessId: string
  typeOfBusiness: string
  obligationDetails: Array<{
    status: 'Open' | 'Fulfilled'
    inboundCorrespondenceFromDate: string
    inboundCorrespondenceToDate: string
    inboundCorrespondenceDateReceived?: string
    inboundCorrespondenceDueDate: string
    periodKey: string
  }>
}

export interface HMRCConnection {
  id: string
  entity_id: string
  hmrc_business_id: string
  business_type: string
  business_name?: string
  nino?: string
  utr?: string
  vat_registration_number?: string
  company_registration_number?: string
  oauth_tokens?: OAuthTokens
  oauth_scopes?: string[]
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed' | 'disconnected'
  last_sync_at?: string
  last_sync_error?: string
  business_details?: any
  obligations?: any
  accounting_periods?: any
}

export interface HMRCError {
  code: string
  message: string
  errors?: Array<{
    code: string
    message: string
    path?: string
  }>
}

export interface AuditLogEntry {
  connection_id?: string
  user_id: string
  operation: string
  endpoint?: string
  method?: string
  request_headers?: Record<string, any>
  request_params?: Record<string, any>
  response_status?: number
  response_headers?: Record<string, any>
  response_data?: any
  error_code?: string
  error_message?: string
  error_details?: any
  duration_ms?: number
}