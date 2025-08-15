# HMRC Making Tax Digital for Income Tax (MTDIT) - Phase 1 Integration Guide

## Overview
This guide outlines the minimum functionality standards and API requirements for Phase 1 of Making Tax Digital for Income Tax (MTDIT) integration. Software must facilitate the complete customer journey from digital record keeping through to final tax declaration.

## Minimum Functionality Standards

### Core Requirements
Software products must provide the following capabilities:

1. **Fraud Prevention Headers** - Submit required fraud prevention header data with all API calls
2. **Business Identification** - Retrieve and manage Business IDs for each customer's businesses
3. **Digital Record Keeping** - Create and maintain digital records for tax purposes
4. **Quarterly Updates** - Submit updates for:
   - Self-employment income and expenses
   - UK property income and expenses  
   - Foreign property income and expenses
5. **Tax Liability Estimates** - Display income tax liability estimates to customers
6. **Business Income Adjustments** - Allow adjustments and finalization of business income
7. **Loss Management** - Handle business losses appropriately
8. **Non-Mandated Income** - Support additional income sources beyond mandatory ones
9. **Final Declaration** - Enable final tax declaration submission

### Customer Data Requirements
- Customers must own and have access to their digital records
- Ability to export records in standard formats
- Clear visibility of tax calculations and liabilities

## Phase 1 Required APIs

### 1. Business Details API (`/individuals/business/details`)
**Purpose**: Retrieve business information for a customer
**Key Endpoints**:
- `GET /individuals/business/details/{nino}/list` - List all businesses
- `GET /individuals/business/details/{nino}/{businessId}` - Get specific business details
- `PUT /individuals/business/details/{nino}/{businessId}/annual-accounting-type` - Update accounting type

**Implementation Notes**:
- Essential for identifying customer businesses
- Returns Business IDs needed for other API calls
- Must be called first to establish business context

### 2. Self-Employment Business API (`/individuals/business/self-employment`)
**Purpose**: Submit and manage self-employment income and expenses
**Key Endpoints**:
- **Period Summaries**:
  - `POST /{nino}/{businessId}/period` - Create period summary
  - `GET /{nino}/{businessId}/period` - List period summaries
  - `GET /{nino}/{businessId}/period/{periodId}` - Get specific period
  - `PUT /{nino}/{businessId}/period/{periodId}` - Update period summary
- **Annual Summaries**:
  - `PUT /{nino}/{businessId}/annual/{taxYear}` - Submit annual adjustments
  - `GET /{nino}/{businessId}/annual/{taxYear}` - Retrieve annual submission
  - `DELETE /{nino}/{businessId}/annual/{taxYear}` - Delete annual submission

**Implementation Notes**:
- Quarterly submissions required for MTD compliance
- Supports both cash and accruals accounting
- Period summaries must align with obligation periods

### 3. Property Business API (`/individuals/business/property`)
**Purpose**: Submit and manage property income (UK and Foreign)
**Key Endpoints**:
- **UK Property**:
  - `POST /uk/{nino}/{businessId}/period` - Create UK property period
  - `GET /uk/{nino}/{businessId}/period` - List UK property periods
  - `PUT /uk/{nino}/{businessId}/period/{periodId}` - Update UK property period
  - `PUT /uk/{nino}/{businessId}/annual/{taxYear}` - UK property annual submission
- **Foreign Property**:
  - `POST /foreign/{nino}/{businessId}/period` - Create foreign property period
  - `GET /foreign/{nino}/{businessId}/period` - List foreign property periods
  - `PUT /foreign/{nino}/{businessId}/period/{periodId}` - Update foreign property period
  - `PUT /foreign/{nino}/{businessId}/annual/{taxYear}` - Foreign property annual submission

**Implementation Notes**:
- Separate handling for UK and foreign properties
- FHL (Furnished Holiday Lettings) and non-FHL distinctions
- Cumulative summaries available for certain periods

### 4. Obligations API (`/obligations`)
**Purpose**: Retrieve submission obligations and deadlines
**Key Endpoints**:
- `GET /income-tax/income-and-expenditure` - Get quarterly update obligations
- `GET /income-tax/crystallisation` - Get final declaration obligations
- `GET /income-tax/end-of-period-statement` - Get EOPS obligations

**Implementation Notes**:
- Critical for compliance deadline tracking
- Shows fulfilled and outstanding obligations
- Status values: Open, Fulfilled, Overdue

### 5. Business Source Adjustable Summary (BSAS) API
**Purpose**: Adjust and finalize business income summaries
**Key Endpoints**:
- `POST /individuals/self-assessment/adjustable-summary/{nino}/trigger` - Generate BSAS
- `GET /individuals/self-assessment/adjustable-summary/{nino}` - List summaries
- `GET /individuals/self-assessment/adjustable-summary/{nino}/{calculationId}` - Get specific BSAS
- `PUT /individuals/self-assessment/adjustable-summary/{nino}/{calculationId}` - Submit adjustments

**Implementation Notes**:
- Required before final declaration
- Allows end-of-year adjustments
- Separate endpoints for self-employment, UK property, and foreign property

### 6. Individual Calculations API (`/individuals/calculations`)
**Purpose**: Trigger and retrieve tax calculations
**Key Endpoints**:
- `POST /{nino}/self-assessment/{taxYear}` - Trigger calculation
- `GET /{nino}/self-assessment` - List calculations
- `GET /{nino}/self-assessment/{calculationId}` - Get calculation details
- `POST /{nino}/self-assessment/{taxYear}/{calculationId}/final-declaration` - Submit final declaration

**Implementation Notes**:
- Provides tax liability estimates
- Must include accuracy disclaimer
- Final declaration crystallizes tax position

### 7. Individual Losses API (`/individuals/losses`)
**Purpose**: Manage and claim business losses
**Key Endpoints**:
- **Brought Forward Losses**:
  - `POST /{nino}/brought-forward-losses` - Create brought forward loss
  - `GET /{nino}/brought-forward-losses` - List brought forward losses
  - `PUT /{nino}/brought-forward-losses/{lossId}` - Amend loss amount
  - `DELETE /{nino}/brought-forward-losses/{lossId}` - Delete loss
- **Loss Claims**:
  - `POST /{nino}/loss-claims` - Create loss claim
  - `GET /{nino}/loss-claims` - List loss claims
  - `PUT /{nino}/loss-claims/{claimId}` - Amend loss claim
  - `DELETE /{nino}/loss-claims/{claimId}` - Delete loss claim

**Implementation Notes**:
- Supports various loss relief types
- Claims can be carried back, sideways, or forward
- Order of claims can be specified

## Testing Requirements

### Gov-Test-Scenario Headers
For sandbox testing, use these headers to simulate different scenarios:

**Business Details**:
- `BUSINESS_DETAILS_NOT_FOUND` - No businesses found
- `MULTIPLE_BUSINESSES` - Multiple business types

**Property Business**:
- `PROPERTY_INCOME_ALLOWANCE` - Property income allowance applied
- `PROPERTY_EXPENSES` - Standard property expenses

**Self-Employment**:
- `SELF_EMPLOYMENT_PROFIT` - Profitable business
- `SELF_EMPLOYMENT_LOSS` - Loss-making business
- `CLASS_4_NICS_EXEMPT` - Class 4 NICs exemption

**Calculations**:
- `CRYSTALLISATION_REQUIRED` - Ready for final declaration
- `TAX_CALCULATION_ERROR` - Calculation errors
- `ADDITIONAL_RATE` - Additional rate taxpayer

## Implementation Workflow

### 1. Initial Setup
```
1. Authenticate using OAuth2
2. Call Business Details API to get Business IDs
3. Check Obligations API for submission requirements
```

### 2. Quarterly Submissions
```
For each quarter:
1. Create/update period summaries (Self-Employment/Property APIs)
2. Submit before deadline shown in Obligations
3. Verify submission via Obligations API status change
```

### 3. End of Year Process
```
1. Submit any final period updates
2. Create annual summaries with adjustments
3. Trigger BSAS generation
4. Review and adjust BSAS if needed
5. Trigger tax calculation
6. Review calculation results
```

### 4. Final Declaration
```
1. Ensure all obligations fulfilled
2. Review final tax calculation
3. Submit final declaration
4. Confirm crystallization complete
```

## Error Handling

### Common Error Codes
- `MATCHING_RESOURCE_NOT_FOUND` - Invalid NINO or Business ID
- `DUPLICATE_SUBMISSION` - Period already exists
- `BUSINESS_VALIDATION_FAILURE` - Business rule violation
- `TAX_YEAR_NOT_SUPPORTED` - Tax year not available
- `OBLIGATIONS_NOT_MET` - Missing required submissions

### Rate Limiting
- Sandbox: 150 requests per minute
- Production: Varies by endpoint
- Implement exponential backoff for 429 errors

## Compliance Checklist

### Phase 1 Mandatory Features
- [ ] OAuth2 authentication implemented
- [ ] Business Details retrieval working
- [ ] Self-employment quarterly updates functional
- [ ] UK property quarterly updates functional
- [ ] Foreign property quarterly updates (if applicable)
- [ ] Annual summaries submission capability
- [ ] BSAS generation and adjustment
- [ ] Tax calculation display with disclaimer
- [ ] Loss management (if applicable)
- [ ] Final declaration submission
- [ ] Obligations tracking and display
- [ ] Fraud prevention headers implemented

### Data Retention Requirements
- Digital records must be kept for 5 years
- Quarterly submissions cannot be amended after year-end
- Final declarations are permanent once crystallized

## API Collection Organization

### Recommended Folder Structure
```
/api-testing/hmrc-mtd/
├── MTDIT/                          # Phase 1 Required APIs
│   ├── 01-business-details/        # Business identification
│   ├── 02-obligations/             # Submission deadlines
│   ├── 03-self-employment/         # Self-employment submissions
│   ├── 04-property-business/       # Property submissions
│   ├── 05-bsas/                   # Adjustable summaries
│   ├── 06-calculations/            # Tax calculations
│   └── 07-losses/                  # Loss management
├── collections/                    # All other APIs
│   ├── individuals-income/        # Additional income sources
│   ├── self-assessment/           # Other SA APIs
│   └── support/                   # Testing and support APIs
```

## Testing Strategy

### Priority Testing Order
1. **Authentication Flow** - Ensure OAuth2 works
2. **Business Details** - Verify business retrieval
3. **Obligations** - Check deadlines and statuses
4. **Period Submissions** - Test quarterly updates
5. **Annual Adjustments** - Verify year-end process
6. **BSAS Generation** - Test summary generation
7. **Calculations** - Verify tax calculations
8. **Final Declaration** - Test crystallization

### Test Data Requirements
- Valid NINO with test businesses
- At least one self-employment
- At least one property (UK or foreign)
- Multiple tax years of data
- Various income/expense scenarios

## Support Resources

### Documentation
- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk)
- [API Documentation](https://developer.service.hmrc.gov.uk/api-documentation/docs/api)
- [Testing Guide](https://developer.service.hmrc.gov.uk/api-documentation/docs/testing)
- [Fraud Prevention Headers](https://developer.service.hmrc.gov.uk/guides/fraud-prevention)

### Test Credentials
- Sandbox Client ID: `iQetMYZLL2Gq9dmqFTcJGSVMLpxZ`
- Test NINO: `NE101272A`
- Business ID: `XBIS12345678901`

---

*Last Updated: August 14, 2025*
*Phase: 1 - Core MTDIT Requirements*
*Status: Ready for Implementation*