# HMRC MTD API Testing with Bruno

This directory contains the Bruno collection for testing HMRC Making Tax Digital (MTD) APIs.

## ⚠️ Important: Repository Structure

To keep the repository clean and manageable:

### What IS Committed:
- ✅ Bruno test files (`.bru` files) - 219 API tests
- ✅ Test scripts (`.sh`, `.ts` files)
- ✅ Configuration files
- ✅ Essential documentation

### What is NOT Committed (git-ignored):
- ❌ OpenAPI specifications (>130,000 lines) - download when needed
- ❌ Generated HTML reports
- ❌ Token files and credentials
- ❌ Large documentation files (SVGs, PDFs)
- ❌ Postman collections

### Downloading OpenAPI Specs

If you need the OpenAPI specifications for reference:

```bash
# Download specs from HMRC Developer Hub
./download-specs.sh
```

The specs will be downloaded to `openapi-specs/` but are git-ignored to keep the repository size manageable.

## Quick Start

### 1. Install Bruno Desktop App
Download Bruno from: https://www.usebruno.com/downloads

### 2. Set Up Environment
Copy `.env.example` to `.env` and add your HMRC credentials:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Import Postman Collection (if migrating)
If you have an existing Postman collection:
```bash
# Place your exported Postman files in this directory
# Then run the conversion script
node convert-postman.js postman-collection.json postman-environment.json
```

### 4. Open in Bruno
1. Open Bruno app
2. Click "Open Collection"
3. Navigate to this directory (`api-testing/hmrc-mtd`)
4. Select the environment (Sandbox or Production)

## Directory Structure

```
hmrc-mtd/
├── auth/                 # OAuth2 authentication flows
├── environments/         # Environment configurations
├── scripts/             # Pre/post request scripts
├── bruno.json           # Collection configuration
├── .env                 # Your credentials (create from .env.example)
└── README.md           # This file
```

## OAuth2 Flow

### Initial Setup
1. Register your application at [HMRC Developer Hub](https://developer.service.hmrc.gov.uk)
2. Add your Client ID and Secret to `.env`
3. Set up your redirect URI

### Authentication Process
1. **Authorize**: Run `auth/oauth2-authorize.bru` and open URL in browser
2. **Login**: Use Government Gateway credentials
3. **Get Code**: Copy authorization code from redirect URL
4. **Exchange**: Run `auth/oauth2-token.bru` with the code
5. **Use Token**: Access token is automatically saved for API calls

### Token Management
- Tokens expire in 4 hours
- Use `auth/refresh-token.bru` to refresh
- Tokens are automatically saved to environment variables

## Testing

### Run Tests Locally
```bash
# Install Bruno CLI if not already installed
bun add -g @usebruno/cli

# Run all tests
bru run --env sandbox

# Run specific folder
bru run auth --env sandbox

# Generate HTML report
bru run --env sandbox --reporter-html results.html
```

### CI/CD Integration
See `.github/workflows/api-tests.yml` for GitHub Actions setup.

## Environment Variables

### Required for Sandbox
- `HMRC_SANDBOX_CLIENT_ID`: Your sandbox app Client ID
- `HMRC_SANDBOX_CLIENT_SECRET`: Your sandbox app Client Secret

### Required for Production
- `HMRC_PROD_CLIENT_ID`: Your production app Client ID
- `HMRC_PROD_CLIENT_SECRET`: Your production app Client Secret

### Test Users
Create test users at: https://developer.service.hmrc.gov.uk/api-test-user

## Common Issues

### Token Expired
Run `auth/refresh-token.bru` to get a new access token.

### Invalid Credentials
- Verify Client ID and Secret in `.env`
- Check you're using correct environment (sandbox vs production)

### Rate Limiting
HMRC enforces rate limits. Add delays between requests if needed:
```bash
bru run --delay 1000 --env sandbox
```

## Resources

- [HMRC Developer Hub](https://developer.service.hmrc.gov.uk)
- [MTD API Documentation](https://developer.service.hmrc.gov.uk/api-documentation)
- [Bruno Documentation](https://docs.usebruno.com)
- [OAuth2 Guide](https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation)

## Support

For issues related to:
- **Bruno setup**: Check Bruno docs or this README
- **HMRC APIs**: Visit HMRC Developer Hub
- **This collection**: Update or check git history
