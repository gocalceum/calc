# HMRC API Testing - Comprehensive Plan & Current State

## Current State Analysis

### File Structure Issues
The current implementation has organizational problems that need to be addressed:

#### 1. Misplaced API Collections
- **Issue**: All 183 API endpoints are incorrectly nested under `/api-testing/hmrc-mtd/business-details-mtd/collections/`
- **Should be**: `/api-testing/hmrc-mtd/collections/`
- **Impact**: Confusing structure, harder to maintain and navigate

#### 2. Business Details API Duplication
- **Issue**: Business Details API has files in multiple locations:
  - Loose files in `/business-details-mtd/` (01-list-all-businesses-test-only.bru, etc.)
  - Should be consolidated in `/collections/business/business-details/`
- **Impact**: Duplicate test files, unclear which to use

### Current Statistics
- **Total .bru files found**: 222 (excluding node_modules)
- **API endpoints in collections**: 183
- **APIs imported**: 25/28 (89% coverage)
- **Missing APIs**: 3 Income Tax MTD APIs not yet imported

### Existing Directory Structure
```
/api-testing/hmrc-mtd/
├── auth/                           # OAuth2 authentication (working)
├── business-details-mtd/           # Misplaced - contains all collections
│   ├── collections/               # Should be moved up one level
│   │   ├── business/             # 4 APIs
│   │   ├── individuals-income/   # 13 APIs  
│   │   ├── calculations/         # 3 APIs
│   │   ├── self-assessment/      # 4 APIs
│   │   └── support/              # 1 API
│   └── openapi-specs/            # Downloaded YAML files
├── collections/                    # Currently empty (should contain APIs)
│   └── environments/             # Only has sandbox.bru
└── scripts/                       # Import and test runners
```

## Reorganization Plan

### Phase 1: Fix Directory Structure

#### 1.1 Move Collections to Correct Location
```bash
# Move all API collections to root collections folder
mv /api-testing/hmrc-mtd/business-details-mtd/collections/* /api-testing/hmrc-mtd/collections/

# Move OpenAPI specs to root level
mv /api-testing/hmrc-mtd/business-details-mtd/openapi-specs /api-testing/hmrc-mtd/

# Create business-details subfolder in correct location
mkdir -p /api-testing/hmrc-mtd/collections/business/business-details

# Move loose Business Details API files
mv /api-testing/hmrc-mtd/business-details-mtd/*.bru /api-testing/hmrc-mtd/collections/business/business-details/
```

#### 1.2 Target Directory Structure
```
/api-testing/hmrc-mtd/
├── auth/                          # OAuth2 authentication flows
├── collections/                   # All API collections (organized)
│   ├── business/                 # Business APIs
│   │   ├── business-details/
│   │   ├── business-income-source-summary/
│   │   ├── business-source-adjustable-summary/
│   │   ├── property-business/
│   │   └── self-employment-business/
│   ├── individuals-income/       # Individual Income APIs
│   │   ├── capital-gains/
│   │   ├── dividends/
│   │   ├── employments/
│   │   ├── foreign/
│   │   ├── insurance-policies/
│   │   ├── other/
│   │   ├── pensions/
│   │   ├── savings/
│   │   ├── state-benefits/
│   │   ├── expenses/
│   │   ├── charges/
│   │   ├── disclosures/
│   │   └── reliefs/
│   ├── calculations/             # Calculation APIs
│   │   ├── individual-calculations/
│   │   ├── individual-losses/
│   │   └── obligations/
│   ├── self-assessment/          # Self Assessment APIs
│   │   ├── accounts/
│   │   ├── assist/
│   │   ├── individual-details/
│   │   └── test-support/
│   ├── support/                  # Support APIs
│   │   └── fraud-prevention-headers/
│   └── environments/             # Environment configs
│       ├── sandbox.bru
│       └── production.bru
├── openapi-specs/                # All OpenAPI YAML files
├── scripts/                      # Utility scripts
├── test-data/                    # Test fixtures and scenarios
└── reports/                      # Test execution reports
```

### Phase 2: Complete API Coverage

#### 2.1 Import Missing APIs
Identify and import the 3 missing Income Tax MTD APIs from the original list of 28.

#### 2.2 Expand to Other Tax Domains
- VAT MTD APIs
- Corporation Tax APIs
- PAYE APIs
- National Insurance APIs

#### 2.3 Update Import Scripts
Fix `bulk-import-mtd-apis.ts` to use correct output paths:
```typescript
// Change from:
const baseDir = join(process.cwd(), "collections");

// To:
const baseDir = join(process.cwd(), "../collections");
```

### Phase 3: Enhanced Test Runner

#### 3.1 Unified Test Orchestrator Features
```typescript
// run-comprehensive-tests.ts
interface TestConfig {
  environment: 'sandbox' | 'production';
  categories?: string[];  // Run specific categories
  scenarios?: string[];   // Gov-Test-Scenario values
  parallel?: boolean;     // Run tests in parallel
  retryCount?: number;    // Retry failed tests
  reportFormat?: 'json' | 'html' | 'junit';
}
```

#### 3.2 Test Execution Flow
1. **Pre-flight checks**
   - Verify environment variables
   - Check OAuth2 token validity
   - Refresh token if needed

2. **Test organization**
   - Group tests by API/category
   - Apply rate limiting
   - Handle dependencies between tests

3. **Execution**
   - Run tests with proper error handling
   - Collect metrics (response time, success rate)
   - Handle retries for transient failures

4. **Reporting**
   - Generate detailed test reports
   - Track API coverage
   - Performance metrics
   - Error analysis

### Phase 4: Test Scenarios & Data Management

#### 4.1 Test Data Structure
```
/test-data/
├── fixtures/
│   ├── business-details.json
│   ├── employment-data.json
│   └── tax-calculations.json
├── scenarios/
│   ├── happy-path/
│   ├── edge-cases/
│   └── error-cases/
└── cleanup-scripts/
```

#### 4.2 Gov-Test-Scenario Coverage
Create comprehensive tests for all available test scenarios:
- `BUSINESS_DETAILS_NOT_FOUND`
- `PROPERTY_INCOME_ALLOWANCE`
- `SELF_EMPLOYMENT_MULTIPLE`
- `CRYSTALLISATION_REQUIRED`
- `TAX_CALCULATION_ERROR`
- etc.

#### 4.3 Negative Testing
- Invalid NINo
- Expired tokens
- Rate limit exceeded
- Malformed requests
- Business logic violations

### Phase 5: CI/CD Integration

#### 5.1 GitHub Actions Workflow
```yaml
name: HMRC API Tests
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  push:
    paths:
      - 'api-testing/**'
  workflow_dispatch:
    inputs:
      test_category:
        description: 'Test category to run'
        required: false
        default: 'all'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - name: Install dependencies
        run: cd api-testing/hmrc-mtd && bun install
      - name: Run API tests
        run: bun run-comprehensive-tests.ts --category=${{ inputs.test_category }}
      - name: Upload test results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: api-testing/hmrc-mtd/reports/
```

#### 5.2 Monitoring & Alerts
- Slack/email notifications for failures
- Performance degradation alerts
- API availability monitoring
- Test coverage tracking

### Phase 6: Documentation & Reporting

#### 6.1 Documentation Structure
```
/docs/
├── API_COVERAGE.md           # Current API coverage status
├── TEST_SCENARIOS.md         # All test scenarios documentation
├── TROUBLESHOOTING.md       # Common issues and solutions
├── PERFORMANCE_BASELINE.md  # Expected response times
└── OAUTH2_GUIDE.md          # OAuth2 flow documentation
```

#### 6.2 Reporting Dashboard
- API coverage percentage
- Test execution history
- Performance trends
- Error patterns
- Rate limit usage

## Implementation Priority

### Immediate (Phase 1)
1. **Fix directory structure** - Move collections to correct location
2. **Update import scripts** - Fix paths in bulk-import-mtd-apis.ts
3. **Consolidate Business Details** - Remove duplicates

### Short-term (Phase 2-3)
1. **Import missing APIs** - Complete 100% coverage
2. **Create unified test runner** - Better orchestration
3. **Add basic CI/CD** - GitHub Actions workflow

### Medium-term (Phase 4-5)
1. **Comprehensive test scenarios** - Full Gov-Test-Scenario coverage
2. **Performance testing** - Baseline and monitoring
3. **Advanced CI/CD** - Scheduled runs, notifications

### Long-term (Phase 6)
1. **Full documentation** - Complete guides
2. **Reporting dashboard** - Visual test results
3. **Expand to other tax domains** - VAT, Corporation Tax, etc.

## Success Metrics

### Coverage Metrics
- ✅ 100% of HMRC MTD APIs imported
- ✅ All endpoints have at least one test
- ✅ All Gov-Test-Scenarios covered
- ✅ Negative test cases for each endpoint

### Quality Metrics
- ✅ All tests pass in CI/CD
- ✅ Response time < 2s for 95% of requests
- ✅ Zero false positives in test results
- ✅ Automated token refresh working

### Maintenance Metrics
- ✅ New APIs can be imported in < 5 minutes
- ✅ Test failures provide clear error messages
- ✅ Documentation stays up-to-date
- ✅ Easy onboarding for new team members

## Quick Reference Commands

```bash
# Fix directory structure
cd /api-testing/hmrc-mtd
mv business-details-mtd/collections/* collections/
mv business-details-mtd/openapi-specs .

# Import missing APIs
bun bulk-import-mtd-apis.ts

# Run all tests
bun run-all-tests.ts

# Run specific category
bun run-all-tests.ts --category=business

# Run with specific scenario
bun run-all-tests.ts --scenario=BUSINESS_DETAILS_NOT_FOUND

# Generate coverage report
bun generate-coverage-report.ts

# Check OAuth2 token status
bun check-token-status.ts
```

## Known Issues & Solutions

### Issue 1: Token Expiry
**Problem**: Access tokens expire after 4 hours
**Solution**: Automated refresh token mechanism in place

### Issue 2: Rate Limiting
**Problem**: HMRC APIs have rate limits
**Solution**: Implement exponential backoff and request queuing

### Issue 3: Test Data Consistency
**Problem**: Test data changes between environments
**Solution**: Use Gov-Test-Scenario headers for consistent data

### Issue 4: OAuth2 Redirect
**Problem**: Redirect URI must match exactly
**Solution**: Use https://oauth.pstmn.io/v1/callback consistently

## Next Steps

1. **Immediate Action**: Fix directory structure issues
2. **Today**: Import remaining 3 APIs
3. **This Week**: Implement unified test runner
4. **This Month**: Complete CI/CD integration
5. **Ongoing**: Maintain documentation and expand coverage

---

*Last Updated: August 14, 2025*
*Status: Planning Phase - Ready for Implementation*