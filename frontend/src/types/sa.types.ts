// Self Assessment (HMRC) API Type Definitions

export interface SAConnection {
  id: string
  entity_id: string
  hmrc_business_id: string
  business_type:
    | 'sole_trader'
    | 'landlord'
    | 'freelancer'
    | 'partnership'
    | 'limited_company'
    | 'trust'
    | 'other'
  business_name?: string
  nino?: string
  utr?: string
  vat_registration_number?: string
  company_registration_number?: string
  oauth_scopes?: string[]
  sync_status: 'pending' | 'syncing' | 'completed' | 'failed' | 'disconnected'
  last_sync_at?: string
  last_sync_error?: string
  next_sync_at?: string
  business_details?: SABusinessDetails
  obligations?: SAObligation[]
  accounting_periods?: AccountingPeriod[]
  is_active: boolean
  connected_at?: string
  disconnected_at?: string
  created_at: string
  updated_at: string
}

export interface SABusinessDetails {
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
}

export interface SAObligation {
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

export interface AccountingPeriod {
  accountingPeriodStartDate: string
  accountingPeriodEndDate: string
}

export interface OAuthInitiateResponse {
  auth_url: string
  state: string
}

export interface OAuthCallbackResponse {
  success: boolean
  entity_id: string
  connections: Array<{
    connection_id: string
    business_id: string
    business_type: string
    business_name: string
  }>
}

export interface SAError {
  error: string
  details?: unknown
}
