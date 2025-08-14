# Business Details MTD Collection

This collection was generated from HMRC's OpenAPI specification for the Business Details (MTD) API.

## Setup

1. Update the access token in `environments/sandbox.bru`
2. Set the appropriate Gov-Test-Scenario value (sandbox only)

## Gov-Test-Scenario Header (Sandbox Only)

This header controls which test data is returned in the sandbox environment:

| Value | Description |
|-------|-------------|
| (empty/omitted) | Returns actual test user data |
| DEFAULT | Self-employment business |
| PROPERTY | UK property business |
| FOREIGN_PROPERTY | Foreign property business |
| BUSINESS_AND_PROPERTY | All business types |
| UNSPECIFIED | Property-unspecified business |
| NOT_FOUND | No data found |
| STATEFUL | Uses stateful test data |

## Important Notes

- The `Gov-Test-Scenario` header is **only** available in sandbox
- In production, this header should not be sent
- Without the header, you get the actual test user's data
- With the header, you get simulated scenario data

## Test User Data (Without Gov-Test-Scenario)

- **NINO**: NE101272A
- **Business ID**: XBIS12345678901
- **Trading Name**: Company X
- **Type**: Self-Employment

## Running Tests

```bash
# Run all tests
bru run --env sandbox

# Run specific test
bru run 01-list-all-businesses-test-only.bru --env sandbox

# Test different scenarios
bru run test-scenarios.bru
```