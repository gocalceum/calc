# Bruno API Testing Implementation Plan

## Overview
This document outlines the plan for implementing Bruno as our API testing and management tool, specifically for HMRC MTD (Making Tax Digital) APIs. We're migrating from an existing Postman collection that includes OAuth2 testing.

## Migration Strategy

### 1. Export from Postman
- Export HMRC collection from Postman as JSON (v2.1 format)
- Export any environment files

### 2. Convert to Bruno

**Install converter:**
```bash
npm install -g @usebruno/converters
```

**Conversion script (convert-postman.js):**
```javascript
const { postmanToBruno, postmanToBrunoEnvironment } = require('@usebruno/converters');
const { readFile, writeFile } = require('fs/promises');

async function convert() {
  // Convert collection
  const collectionData = await readFile('hmrc-postman-collection.json', 'utf8');
  const brunoCollection = postmanToBruno(JSON.parse(collectionData));
  await writeFile('bruno-collection.json', JSON.stringify(brunoCollection, null, 2));
  
  // Convert environments if available
  const envData = await readFile('hmrc-postman-environment.json', 'utf8');
  const brunoEnv = postmanToBrunoEnvironment(JSON.parse(envData));
  await writeFile('bruno-environment.json', JSON.stringify(brunoEnv, null, 2));
}

convert().catch(console.error);
```

## Project Structure

```
/api-testing/
├── hmrc-mtd/
│   ├── bruno.json          # Collection configuration
│   ├── .env                # Local secrets (never commit)
│   ├── .env.example        # Template for environment variables
│   ├── .gitignore          # Git ignore rules
│   ├── environments/
│   │   ├── sandbox.bru     # HMRC sandbox environment
│   │   └── production.bru  # HMRC production environment
│   ├── auth/
│   │   └── (migrated OAuth2 requests)
│   └── (other migrated API requests organized by function)
```

## Configuration Files

### Collection Configuration (bruno.json)
```json
{
  "version": "1",
  "name": "HMRC MTD APIs",
  "type": "collection",
  "scripts": {
    "moduleWhitelist": ["crypto", "axios"],
    "filesystemAccess": {
      "allow": true
    }
  }
}
```

### Environment Files

**sandbox.bru:**
```bru
vars {
  base_url: https://test-api.service.hmrc.gov.uk
  auth_url: https://test-www.tax.service.gov.uk
  client_id: {{process.env.HMRC_SANDBOX_CLIENT_ID}}
  client_secret: {{process.env.HMRC_SANDBOX_CLIENT_SECRET}}
  redirect_uri: http://localhost:9000/callback
}
vars:secret [
  client_secret,
  access_token,
  refresh_token
]
```

**production.bru:**
```bru
vars {
  base_url: https://api.service.hmrc.gov.uk
  auth_url: https://www.tax.service.gov.uk
  client_id: {{process.env.HMRC_PROD_CLIENT_ID}}
  client_secret: {{process.env.HMRC_PROD_CLIENT_SECRET}}
  redirect_uri: https://app.calceum.com/hmrc-callback
}
vars:secret [
  client_secret,
  access_token,
  refresh_token
]
```

### Secret Management (.env)
```bash
# HMRC Sandbox Credentials
HMRC_SANDBOX_CLIENT_ID=your_sandbox_client_id
HMRC_SANDBOX_CLIENT_SECRET=your_sandbox_client_secret

# HMRC Production Credentials
HMRC_PROD_CLIENT_ID=your_prod_client_id
HMRC_PROD_CLIENT_SECRET=your_prod_client_secret

# Test User Credentials
TEST_USER_ID=your_test_gateway_id
TEST_USER_PASSWORD=your_test_password
```

### Git Ignore (.gitignore)
```
.env
*.local
node_modules/
results.html
results.json
results.xml
*.log
```

## OAuth2 Implementation

### Token Management Script
Add to collection-level post-response script:
```javascript
// Auto-save tokens from OAuth2 responses
if(req.getAuthMode() == 'oauth2' && res.body.access_token) {
    bru.setVar('access_token', res.body.access_token);
    if(res.body.refresh_token) {
        bru.setVar('refresh_token', res.body.refresh_token);
    }
    bru.setVar('token_expiry', Date.now() + (res.body.expires_in * 1000));
}
```

### Auto-Refresh Logic
Add to pre-request scripts where needed:
```javascript
const tokenExpiry = bru.getVar('token_expiry');
if (tokenExpiry && Date.now() > tokenExpiry - 60000) { // Refresh 1 min before expiry
    // Trigger refresh token request
    await bru.runRequest('auth/refresh-token');
}
```

## HMRC API Specifics

### Required Headers
All HMRC API requests need:
```
Accept: application/vnd.hmrc.1.0+json
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

### OAuth2 Scopes
Common scopes for MTD:
- `read:vat write:vat` - VAT operations
- `read:self-assessment` - Self Assessment read
- `write:self-assessment` - Self Assessment write
- `read:income-tax` - Income Tax read

### Rate Limiting
HMRC enforces rate limits:
- Sandbox: More lenient for testing
- Production: Strict limits, monitor responses for 429 status

## Testing

### Local Testing
```bash
# Test single request
bru run auth/oauth2-token.bru --env sandbox

# Run entire collection
bru run --env sandbox

# Generate HTML report
bru run --env sandbox --reporter-html results.html

# Generate JUnit report for CI/CD
bru run --env sandbox --reporter-junit results.xml
```

### Data-Driven Testing
Create CSV/JSON files for multiple test scenarios:
```csv
vrn,period_key,vat_due_sales,vat_due_acquisitions
123456789,18A1,1000.00,200.00
987654321,18A2,2000.00,400.00
```

Run with data file:
```bash
bru run --env sandbox --csv-file-path test-data.csv
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: HMRC API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Bruno CLI
      run: npm install -g @usebruno/cli
    
    - name: Run HMRC API Tests
      run: |
        cd api-testing/hmrc-mtd
        bru run --env sandbox --reporter-junit results.xml
      env:
        HMRC_SANDBOX_CLIENT_ID: ${{ secrets.HMRC_SANDBOX_CLIENT_ID }}
        HMRC_SANDBOX_CLIENT_SECRET: ${{ secrets.HMRC_SANDBOX_CLIENT_SECRET }}
    
    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-results
        path: api-testing/hmrc-mtd/results.xml
```

## Best Practices

### 1. Security
- Never commit `.env` files
- Use environment variables for all secrets
- Store production credentials in secure vaults
- Use `vars:secret` for sensitive variables in environments

### 2. Organization
- Group requests by functionality
- Use descriptive names for requests
- Add documentation in request descriptions
- Keep test assertions comprehensive

### 3. Version Control
- Track all `.bru` files in Git
- Use meaningful commit messages
- Review changes to API contracts
- Tag releases for production deployments

### 4. Testing
- Test in sandbox before production
- Use data-driven testing for edge cases
- Implement proper error handling
- Validate response schemas

### 5. Maintenance
- Keep OAuth2 tokens refreshed automatically
- Monitor API deprecation notices
- Update Bruno CLI regularly
- Document any HMRC-specific quirks

## Implementation Checklist

- [ ] Export Postman collection and environments
- [ ] Install Bruno and converter tools
- [ ] Create project directory structure
- [ ] Convert Postman collection to Bruno format
- [ ] Set up environment configurations
- [ ] Configure OAuth2 token management
- [ ] Test migrated collection in Bruno app
- [ ] Add test assertions
- [ ] Set up .env with credentials
- [ ] Test with HMRC sandbox
- [ ] Configure CI/CD pipeline
- [ ] Document any custom scripts or workarounds
- [ ] Train team on Bruno usage

## Troubleshooting

### Common Issues

1. **OAuth2 Token Expiry**
   - Implement auto-refresh in pre-request scripts
   - Check token_expiry timestamp

2. **HMRC Rate Limiting**
   - Add delays between requests: `bru run --delay 1000`
   - Monitor for 429 responses

3. **Certificate Issues**
   - Configure client certificates if required
   - Use `--insecure` flag for testing only

4. **Environment Variable Not Found**
   - Check .env file exists and is in correct location
   - Verify variable names match exactly

## Resources

- [Bruno Documentation](https://docs.usebruno.com)
- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk)
- [HMRC MTD API Documentation](https://developer.service.hmrc.gov.uk/api-documentation)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## Notes

- This plan focuses on HMRC MTD APIs but can be extended for other APIs
- Start with sandbox testing before moving to production
- Keep this document updated as requirements evolve