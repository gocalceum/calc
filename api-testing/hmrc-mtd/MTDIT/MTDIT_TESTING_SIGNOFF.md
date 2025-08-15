# MTDIT Phase 1 - Testing Sign-off Document

## Executive Summary
This document provides a comprehensive testing checklist for Making Tax Digital for Income Tax (MTDIT) Phase 1 APIs. All endpoints listed below MUST be tested for Production approval.

**Total Endpoints to Test: 75**
**Required APIs: 7**
**Testing Deadline: Before Production Approval Request**

---

## 1. BUSINESS DETAILS API
**Purpose:** Retrieve Business IDs and details for customer businesses  
**Total Endpoints: 10**  
**Priority: CRITICAL - Must be tested first**
**API Version Required: 1.0 (uses Accept: application/vnd.hmrc.2.0+json)**

### Endpoints Checklist
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | List all businesses | GET | `/individuals/business/details/{nino}/list` | ☑ | PASS | Returns 200 with business list |
| 02 | Retrieve business details | GET | `/individuals/business/details/{nino}/{businessId}` | ☑ | PASS | Returns 200 with full details |
| 03 | Create/amend quarterly period type | PUT | `/individuals/business/details/{nino}/{businessId}/{taxYear}` | ☑ | PASS | Returns 204, path is /{taxYear} not /quarterly-period-type |
| 04 | Retrieve accounting type | GET | `/individuals/business/details/{nino}/{businessId}/{taxYear}/accounting-type` | ☑ | PASS | Returns 200, path needs {taxYear} |
| 05 | Update accounting type | PUT | `/individuals/business/details/{nino}/{businessId}/{taxYear}/accounting-type` | ☑ | PASS | Returns 204 |
| 06 | Retrieve periods of account | GET | `/individuals/business/details/{nino}/{businessId}/{taxYear}/periods-of-account` | ☑ | PASS | Returns 200, needs {taxYear} in path |
| 07 | Create/update periods of account | PUT | `/individuals/business/details/{nino}/{businessId}/{taxYear}/periods-of-account` | ☑ | FAIL | Returns 400 - incorrect body format |
| 08 | Test business details (test) | GET | `/individuals/business/details/{nino}/{businessId}` | ☑ | PASS | Same as #02 |
| 09 | Test business list (test) | GET | `/individuals/business/details/{nino}/list` | ☑ | PASS | With Gov-Test-Scenario headers |
| 10 | Test scenarios | GET | Various | ☑ | PASS | BUSINESS_AND_PROPERTY, NOT_FOUND, STATEFUL tested |

### Test Scenarios Required
- [ ] `BUSINESS_DETAILS_NOT_FOUND` - No businesses found
- [ ] `MULTIPLE_BUSINESSES` - Multiple business types
- [ ] Standard retrieval without Gov-Test-Scenario header

---

## 2. OBLIGATIONS API
**Purpose:** Check submission obligations and deadlines  
**Total Endpoints: 3**  
**Priority: HIGH - Required for compliance tracking**
**API Version Required: 3.0 (uses Accept: application/vnd.hmrc.3.0+json)**

### Endpoints Checklist
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | Retrieve income & expenditure obligations | GET | `/obligations/details/{nino}/income-and-expenditure` | ☑ | PASS | Returns 200, v3.0 required (v2.0 returns 403) |
| 02 | Retrieve final declaration obligations | GET | `/obligations/details/{nino}/crystallisation` | ☑ | PASS | Returns 200/404, crystallisation endpoint |
| 03 | Retrieve end of period statement obligations | GET | `/obligations/details/{nino}/end-of-period-statement` | ☑ | PASS | Returns 200 |

### Obligation Status Values to Test
- [x] `Open` - Obligation not yet fulfilled
- [x] `Fulfilled` - Obligation completed
- [ ] `Overdue` - Past deadline

---

## 3. SELF-EMPLOYMENT BUSINESS API
**Purpose:** Submit self-employment income and expenses  
**Total Endpoints: 9**  
**Priority: CRITICAL - Core MTD requirement**
**API Version Required: 5.0 (uses Accept: application/vnd.hmrc.5.0+json)**

### Endpoints Checklist
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | Retrieve annual submission | GET | `/individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` | ☑ | PASS | Returns 200/404 |
| 02 | Create/amend annual submission | PUT | `/individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` | ☑ | PASS | Returns 200/204 |
| 03 | Delete annual submission | DELETE | `/individuals/business/self-employment/{nino}/{businessId}/annual/{taxYear}` | ☑ | PASS | Returns 204/404 |
| 04 | Create period summary | POST | `/individuals/business/self-employment/{nino}/{businessId}/period/{taxYear}` | ☑ | PASS | v5.0 includes tax year in path |
| 05 | List period summaries | GET | `/individuals/business/self-employment/{nino}/{businessId}/period/{taxYear}` | ☑ | PASS | v5.0 includes tax year in path |
| 06 | Retrieve period summary | GET | `/individuals/business/self-employment/{nino}/{businessId}/period/{taxYear}/{periodId}` | ☑ | PASS | v5.0 format |
| 07 | Amend period summary | PUT | `/individuals/business/self-employment/{nino}/{businessId}/period/{taxYear}/{periodId}` | ☑ | PASS | Returns 200/204 |
| 08 | Retrieve cumulative summary | GET | Not available in v5.0 | ☐ | N/A | Endpoint removed in v5.0 |
| 09 | Create/amend cumulative summary | PUT | Not available in v5.0 | ☐ | N/A | Endpoint removed in v5.0 |

### Quarterly Submission Requirements
- [ ] Q1: April 6 - July 5
- [ ] Q2: July 6 - October 5
- [ ] Q3: October 6 - January 5
- [ ] Q4: January 6 - April 5

### Test Scenarios Required
- [x] `SELF_EMPLOYMENT_PROFIT` - Profitable business
- [ ] `SELF_EMPLOYMENT_LOSS` - Loss-making business
- [ ] `CLASS_4_NICS_EXEMPT` - Class 4 NICs exemption
- [x] `STATEFUL` - Tested stateful scenarios

---

## 4. PROPERTY BUSINESS API
**Purpose:** Submit property income (UK and Foreign)  
**Total Endpoints: 30**  
**Priority: CRITICAL - Core MTD requirement**

### UK Property Endpoints (7)
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | Retrieve UK property annual submission | GET | `/uk/{nino}/{businessId}/annual/{taxYear}` | ☐ | | |
| 02 | Create/amend UK property annual submission | PUT | `/uk/{nino}/{businessId}/annual/{taxYear}` | ☐ | | |
| 03 | Create UK property period summary | POST | `/uk/{nino}/{businessId}/period` | ☐ | | |
| 04 | Retrieve UK property period summary | GET | `/uk/{nino}/{businessId}/period/{periodId}` | ☐ | | |
| 05 | Amend UK property period summary | PUT | `/uk/{nino}/{businessId}/period/{periodId}` | ☐ | | |
| 06 | Retrieve UK property cumulative summary | GET | `/uk/{nino}/{businessId}/cumulative` | ☐ | | |
| 07 | Create/amend UK property cumulative summary | PUT | `/uk/{nino}/{businessId}/cumulative` | ☐ | | |

### Historic UK Property Endpoints (14)
| # | Endpoint | Method | Tested | Pass/Fail | Notes |
|---|----------|--------|--------|-----------|-------|
| 08 | Retrieve historic FHL annual | GET | ☐ | | |
| 09 | Create/amend historic FHL annual | PUT | ☐ | | |
| 10 | Delete historic FHL annual | DELETE | ☐ | | |
| 11 | Retrieve historic non-FHL annual | GET | ☐ | | |
| 12 | Create/amend historic non-FHL annual | PUT | ☐ | | |
| 13 | Delete historic non-FHL annual | DELETE | ☐ | | |
| 14 | List historic FHL periods | GET | ☐ | | |
| 15 | Create historic FHL period | POST | ☐ | | |
| 16 | Retrieve historic FHL period | GET | ☐ | | |
| 17 | Amend historic FHL period | PUT | ☐ | | |
| 18 | List historic non-FHL periods | GET | ☐ | | |
| 19 | Create historic non-FHL period | POST | ☐ | | |
| 20 | Retrieve historic non-FHL period | GET | ☐ | | |
| 21 | Amend historic non-FHL period | PUT | ☐ | | |

### Foreign Property Endpoints (8)
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 22 | Create foreign property period | POST | `/foreign/{nino}/{businessId}/period` | ☐ | | |
| 23 | Retrieve foreign property period | GET | `/foreign/{nino}/{businessId}/period/{periodId}` | ☐ | | |
| 24 | Amend foreign property period | PUT | `/foreign/{nino}/{businessId}/period/{periodId}` | ☐ | | |
| 25 | Retrieve foreign property cumulative | GET | `/foreign/{nino}/{businessId}/cumulative` | ☐ | | |
| 26 | Create/amend foreign property cumulative | PUT | `/foreign/{nino}/{businessId}/cumulative` | ☐ | | |
| 27 | Retrieve foreign property annual | GET | `/foreign/{nino}/{businessId}/annual/{taxYear}` | ☐ | | |
| 28 | Create/amend foreign property annual | PUT | `/foreign/{nino}/{businessId}/annual/{taxYear}` | ☐ | | |
| 29 | Delete property annual submission | DELETE | `/{typeOfBusiness}/{nino}/{businessId}/annual/{taxYear}` | ☐ | | |

### Common Endpoint
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 30 | List property periods | GET | `/{typeOfBusiness}/{nino}/{businessId}/period` | ☐ | | |

### Test Scenarios Required
- [ ] `PROPERTY_INCOME_ALLOWANCE` - Property income allowance applied
- [ ] `PROPERTY_EXPENSES` - Standard property expenses
- [ ] FHL vs Non-FHL property types
- [ ] UK vs Foreign property

---

## 5. BUSINESS SOURCE ADJUSTABLE SUMMARY (BSAS) API
**Purpose:** Adjust and finalize business income  
**Total Endpoints: 8**  
**Priority: CRITICAL - Required for end-of-year**

### Endpoints Checklist
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | List BSAS | GET | `/{nino}` | ☐ | | |
| 02 | Trigger BSAS | POST | `/{nino}/trigger` | ☐ | | |
| 03 | Retrieve self-employment BSAS | GET | `/{nino}/self-employment/{calculationId}` | ☐ | | |
| 04 | Submit self-employment adjustments | PUT | `/{nino}/self-employment/{calculationId}/adjust` | ☐ | | |
| 05 | Retrieve UK property BSAS | GET | `/{nino}/uk-property/{calculationId}` | ☐ | | |
| 06 | Submit UK property adjustments | PUT | `/{nino}/uk-property/{calculationId}/adjust` | ☐ | | |
| 07 | Retrieve foreign property BSAS | GET | `/{nino}/foreign-property/{calculationId}` | ☐ | | |
| 08 | Submit foreign property adjustments | PUT | `/{nino}/foreign-property/{calculationId}/adjust` | ☐ | | |

### BSAS Generation Requirements
- [ ] All 4 quarterly periods submitted
- [ ] Annual submission completed
- [ ] Trigger generates calculation ID
- [ ] Adjustments applied correctly

---

## 6. INDIVIDUAL CALCULATIONS API
**Purpose:** Trigger and retrieve tax calculations  
**Total Endpoints: 4**  
**Priority: CRITICAL - Required for final declaration**

### Endpoints Checklist
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | Trigger calculation | POST | `/{nino}/self-assessment/{taxYear}` | ☐ | | |
| 02 | List calculations | GET | `/{nino}/self-assessment` | ☐ | | |
| 03 | Retrieve calculation | GET | `/{nino}/self-assessment/{calculationId}` | ☐ | | |
| 04 | Submit final declaration | POST | `/{nino}/self-assessment/{taxYear}/{calculationId}/final-declaration` | ☐ | | |

### Calculation Test Scenarios
- [ ] `CRYSTALLISATION_REQUIRED` - Ready for final declaration
- [ ] `TAX_CALCULATION_ERROR` - Calculation errors
- [ ] `ADDITIONAL_RATE` - Additional rate taxpayer
- [ ] Tax liability estimate with disclaimer

---

## 7. INDIVIDUAL LOSSES API
**Purpose:** Manage business losses  
**Total Endpoints: 11**  
**Priority: HIGH - Required if losses exist**

### Brought Forward Losses (5)
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 01 | Create brought forward loss | POST | `/{nino}/brought-forward-losses` | ☐ | | |
| 02 | Amend brought forward loss | PUT | `/{nino}/brought-forward-losses/{lossId}` | ☐ | | |
| 03 | List brought forward losses | GET | `/{nino}/brought-forward-losses` | ☐ | | |
| 04 | Retrieve brought forward loss | GET | `/{nino}/brought-forward-losses/{lossId}` | ☐ | | |
| 05 | Delete brought forward loss | DELETE | `/{nino}/brought-forward-losses/{lossId}` | ☐ | | |

### Loss Claims (6)
| # | Endpoint | Method | Path | Tested | Pass/Fail | Notes |
|---|----------|--------|------|--------|-----------|-------|
| 06 | Create loss claim | POST | `/{nino}/loss-claims` | ☐ | | |
| 07 | List loss claims | GET | `/{nino}/loss-claims` | ☐ | | |
| 08 | Retrieve loss claim | GET | `/{nino}/loss-claims/{claimId}` | ☐ | | |
| 09 | Delete loss claim | DELETE | `/{nino}/loss-claims/{claimId}` | ☐ | | |
| 10 | Amend loss claim type | PUT | `/{nino}/loss-claims/{claimId}/change-type-of-claim` | ☐ | | |
| 11 | Amend loss claims order | PUT | `/{nino}/loss-claims/order` | ☐ | | |

### Loss Relief Types to Test
- [ ] Carry forward
- [ ] Carry back
- [ ] Carry sideways
- [ ] Set against capital gains

---

## TESTING ESSENTIALS

### 1. Fraud Prevention Headers (MANDATORY)
All API calls MUST include compliant fraud prevention headers:

| Header | Required | Description |
|--------|----------|-------------|
| `Gov-Client-Connection-Method` | Yes | How software connects to HMRC |
| `Gov-Client-Device-ID` | Yes | Unique device identifier |
| `Gov-Client-User-IDs` | Yes | User identifiers |
| `Gov-Client-Timezone` | Yes | User's timezone |
| `Gov-Client-Local-IPs` | Yes | Local IP addresses |
| `Gov-Client-Screens` | Conditional | Screen information |
| `Gov-Client-Window-Size` | Conditional | Browser window size |
| `Gov-Client-User-Agent` | Yes | Software user agent |
| `Gov-Client-Multi-Factor` | Conditional | MFA type if used |
| `Gov-Vendor-Version` | Yes | Software version |
| `Gov-Vendor-License-IDs` | Conditional | License identifiers |

### 2. OAuth2 Authentication Flow
- [ ] Authorization endpoint tested
- [ ] Token exchange working
- [ ] Refresh token functional
- [ ] Token expiry handling (4 hours)
- [ ] Scopes: `read:self-assessment write:self-assessment`

### 3. Test User Credentials
```
NINO: NE101272A
Business ID: XBIS12345678901
Tax Year: 2023-24
User ID: 959074877093
Password: WV2iaEfIAo9J
```

### 4. Stateful Testing Journey (7 Days Retention)

#### In-Year Journey
1. [ ] Submit Q1 period summary
2. [ ] Submit Q2 period summary
3. [ ] Submit Q3 period summary
4. [ ] Submit Q4 period summary
5. [ ] Verify obligations fulfilled

#### End-of-Year Journey
1. [ ] Submit annual summary
2. [ ] Trigger BSAS
3. [ ] Review BSAS
4. [ ] Submit adjustments
5. [ ] Trigger calculation
6. [ ] Review calculation
7. [ ] Submit final declaration

### 5. Error Handling Matrix

| Error Code | HTTP Status | Description | Action Required |
|------------|-------------|-------------|-----------------|
| `MATCHING_RESOURCE_NOT_FOUND` | 404 | Invalid NINO/Business ID | Verify identifiers |
| `DUPLICATE_SUBMISSION` | 409 | Period already exists | Check existing periods |
| `BUSINESS_VALIDATION_FAILURE` | 400 | Business rule violation | Review business rules |
| `TAX_YEAR_NOT_SUPPORTED` | 400 | Invalid tax year | Use supported years |
| `OBLIGATIONS_NOT_MET` | 403 | Missing submissions | Complete requirements |
| `CLIENT_OR_AGENT_NOT_AUTHORISED` | 403 | Auth issue | Check authorization |
| `INVALID_REQUEST` | 400 | Malformed request | Fix request format |
| `INVALID_CORRELATIONID` | 400 | Header issue | Fix correlation ID |

### 6. Rate Limiting
- Sandbox: 150 requests/minute
- Production: Varies by endpoint
- Implement exponential backoff for 429 errors
- Retry-After header compliance

---

## PRODUCTION APPROVAL CHECKLIST

### Pre-Testing Requirements
- [ ] Sandbox application registered
- [ ] Test user created
- [ ] OAuth2 credentials obtained
- [ ] Fraud prevention headers implemented

### API Testing Coverage
- [x] Business Details API - 9/10 endpoints tested (1 failed)
- [x] Obligations API - 3/3 endpoints tested
- [x] Self-Employment API - 7/9 endpoints tested (2 N/A in v5.0)
- [ ] Property Business API - 30/30 endpoints tested
- [ ] BSAS API - 8/8 endpoints tested
- [ ] Individual Calculations API - 4/4 endpoints tested
- [ ] Individual Losses API - 11/11 endpoints tested

### Scenario Testing
- [ ] All Gov-Test-Scenario headers tested
- [ ] Stateful journey completed
- [ ] Error scenarios handled
- [ ] Rate limiting tested

### Documentation
- [ ] Production Approvals Checklist completed
- [ ] Test NINO provided to SDSTeam@hmrc.gov.uk
- [ ] Testing completed within 14 days
- [ ] All test results documented

### Final Verification
- [ ] All 75 endpoints tested successfully
- [ ] Fraud prevention headers validated
- [ ] OAuth2 flow working end-to-end
- [ ] Error handling implemented
- [ ] Rate limiting handled
- [ ] Terms of use accepted

---

## SIGN-OFF

### Testing Team
| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Developer | | | |
| QA Engineer | | | |
| Product Owner | | | |
| HMRC Liaison | | | |

### Approval Status
- [ ] Testing Complete
- [ ] Ready for Production
- [ ] Production Access Requested
- [ ] Production Access Granted

### Notes
_Add any additional notes, issues, or observations from testing:_

**Testing Session Notes (Aug 14, 2025):**
- **API Version Issues Resolved:** Obligations API requires v3.0 (not v2.0), Self-Employment API requires v5.0 (not v2.0/v3.0)
- **Business Details API:** 9/10 endpoints working. Create/update periods endpoint returns 400 error - likely body format issue
- **Obligations API:** All 3 endpoints tested successfully with v3.0 headers
- **Self-Employment API:** 7/7 available endpoints tested successfully with v5.0. Cumulative summary endpoints removed in v5.0
- **Path Structure Changes:** v5.0 of Self-Employment API includes tax year in period endpoint paths
- **Bruno Configuration:** Fixed environment variable substitution issues in sandbox.bru file

---

**Document Version:** 1.0  
**Last Updated:** August 14, 2025  
**Next Review:** Before Production Deployment  
**Contact:** SDSTeam@hmrc.gov.uk

---

## APPENDIX A: Quick Test Commands

### Run Individual API Tests
```bash
# Business Details
bru run MTDIT/01-business-details/*.bru --env collections/environments/sandbox

# Obligations
bru run MTDIT/02-obligations/*.bru --env collections/environments/sandbox

# Self-Employment
bru run MTDIT/03-self-employment/*.bru --env collections/environments/sandbox

# Property Business
bru run MTDIT/04-property-business/*.bru --env collections/environments/sandbox

# BSAS
bru run MTDIT/05-bsas/*.bru --env collections/environments/sandbox

# Calculations
bru run MTDIT/06-calculations/*.bru --env collections/environments/sandbox

# Losses
bru run MTDIT/07-losses/*.bru --env collections/environments/sandbox
```

### Run Full Test Suite
```bash
# All MTDIT tests
for dir in MTDIT/*/; do
  echo "Testing $(basename $dir)..."
  bru run "$dir"*.bru --env collections/environments/sandbox
done
```

### Test with Gov-Test-Scenario
```bash
# Set scenario in environment
export GOV_TEST_SCENARIO="BUSINESS_DETAILS_NOT_FOUND"
bru run MTDIT/01-business-details/01-*.bru --env collections/environments/sandbox
```

---

## APPENDIX B: Common Test Data

### Period IDs Format
- Q1: `2023-04-06_2023-07-05`
- Q2: `2023-07-06_2023-10-05`
- Q3: `2023-10-06_2024-01-05`
- Q4: `2024-01-06_2024-04-05`

### Tax Years
- 2022-23: `2022-23`
- 2023-24: `2023-24`
- 2024-25: `2024-25`

### Business Types
- `self-employment`
- `uk-property`
- `foreign-property`

### Accounting Types
- `CASH` - Cash basis
- `ACCRUALS` - Traditional accounting

---

**END OF DOCUMENT**