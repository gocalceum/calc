# MTDIT Phase 1 - Required APIs

This folder contains the **7 mandatory APIs** required for Making Tax Digital for Income Tax (MTDIT) Phase 1 compliance.

## Quick Start

### Test a specific API:
```bash
# Business Details
bru run MTDIT/01-business-details/01-list-all-businesses-test-only.bru --env collections/environments/sandbox

# Self-Employment submission
bru run MTDIT/03-self-employment/04-create-a-self-employment-period-summary.bru --env collections/environments/sandbox
```

### Run all Phase 1 tests:
```bash
# Run all MTDIT tests
for dir in MTDIT/*/; do
  bru run "$dir"*.bru --env collections/environments/sandbox
done
```

## API Organization

| Folder | API | Endpoints | Purpose |
|--------|-----|-----------|---------|
| **01-business-details** | Business Details API | 10 | Retrieve Business IDs and details |
| **02-obligations** | Obligations API | 3 | Check submission deadlines |
| **03-self-employment** | Self-Employment Business API | 9 | Submit self-employment income/expenses |
| **04-property-business** | Property Business API | 30 | Submit property income (UK/Foreign) |
| **05-bsas** | Business Source Adjustable Summary | 8 | Year-end adjustments |
| **06-calculations** | Individual Calculations API | 4 | Trigger tax calculations |
| **07-losses** | Individual Losses API | 11 | Manage business losses |

**Total: 75 endpoints**

## Testing Workflow

### 1. Initial Setup
```bash
# Get Business IDs
bru run MTDIT/01-business-details/01-list-all-businesses-test-only.bru --env collections/environments/sandbox

# Check obligations
bru run MTDIT/02-obligations/01-retrieve-income-tax-self-assessment-income-and-exp.bru --env collections/environments/sandbox
```

### 2. Quarterly Submissions
```bash
# Self-Employment quarterly update
bru run MTDIT/03-self-employment/04-create-a-self-employment-period-summary.bru --env collections/environments/sandbox

# Property quarterly update (UK)
bru run MTDIT/04-property-business/03-create-a-uk-property-income-expenses-period-summar.bru --env collections/environments/sandbox
```

### 3. End of Year Process
```bash
# Generate BSAS
bru run MTDIT/05-bsas/02-trigger-a-business-source-adjustable-summary.bru --env collections/environments/sandbox

# Submit adjustments
bru run MTDIT/05-bsas/04-submit-self-employment-accounting-adjustments.bru --env collections/environments/sandbox

# Trigger calculation
bru run MTDIT/06-calculations/01-trigger-a-self-assessment-tax-calculation-test-onl.bru --env collections/environments/sandbox
```

### 4. Final Declaration
```bash
# Submit final declaration
bru run MTDIT/06-calculations/04-submit-a-self-assessment-final-declaration-test-on.bru --env collections/environments/sandbox
```

## Test Scenarios

Use Gov-Test-Scenario headers to simulate different conditions:

### Business Scenarios
- `BUSINESS_DETAILS_NOT_FOUND` - No businesses
- `MULTIPLE_BUSINESSES` - Multiple business types

### Self-Employment Scenarios
- `SELF_EMPLOYMENT_PROFIT` - Profitable business
- `SELF_EMPLOYMENT_LOSS` - Loss-making business
- `CLASS_4_NICS_EXEMPT` - NICs exemption

### Property Scenarios
- `PROPERTY_INCOME_ALLOWANCE` - Income allowance applied
- `PROPERTY_EXPENSES` - Standard expenses

### Calculation Scenarios
- `CRYSTALLISATION_REQUIRED` - Ready for final declaration
- `TAX_CALCULATION_ERROR` - Calculation errors

## Environment Variables

Required in `.env`:
```bash
HMRC_SANDBOX_CLIENT_ID=iQetMYZLL2Gq9dmqFTcJGSVMLpxZ
HMRC_SANDBOX_CLIENT_SECRET=3ed60b21-3e72-409e-8fb2-d66a8edb0dc6
TEST_USER_NINO=NE101272A
SANDBOX_REDIRECT_URI=https://oauth.pstmn.io/v1/callback
```

## Common Test Data

- **NINO**: `NE101272A`
- **Business ID**: `XBIS12345678901`
- **Tax Year**: `2023-24`
- **Period ID**: Format: `2023-04-06_2023-07-05`

## Error Codes Reference

| Code | Description |
|------|-------------|
| `MATCHING_RESOURCE_NOT_FOUND` | Invalid NINO or Business ID |
| `DUPLICATE_SUBMISSION` | Period already exists |
| `BUSINESS_VALIDATION_FAILURE` | Business rule violation |
| `TAX_YEAR_NOT_SUPPORTED` | Tax year not available |
| `OBLIGATIONS_NOT_MET` | Missing required submissions |

## Compliance Checklist

- [ ] OAuth2 authentication working
- [ ] Business Details retrieval functional
- [ ] Quarterly updates submitting successfully
- [ ] Annual summaries processing
- [ ] BSAS generation and adjustments working
- [ ] Tax calculations returning estimates
- [ ] Loss management functional
- [ ] Final declaration submission working
- [ ] All obligations trackable

## Support

- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk)
- [API Documentation](https://developer.service.hmrc.gov.uk/api-documentation/docs/api)
- [Phase 1 Guide](.claude/HMRC_MTDIT_PHASE1_GUIDE.md)

---

*Phase 1 APIs - Ready for Testing*