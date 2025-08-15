# OAuth2 Flow Helper

## Step 1: Get Authorization Code

Open this URL in your browser and login with test credentials:

```
https://test-www.tax.service.gov.uk/oauth/authorize?response_type=code&client_id=iQetMYZLL2Gq9dmqFTcJGSVMLpxZ&scope=hello read:self-assessment write:self-assessment&redirect_uri=https://oauth.pstmn.io/v1/callback&state=test123
```

**Test User Credentials:**
- User ID: 959074877093
- Password: WV2iaEfIAo9J

## Step 2: Extract Code from Redirect

After login, you'll be redirected to:
```
https://oauth.pstmn.io/v1/callback?code=YOUR_CODE_HERE&state=test123
```

Copy the `code` parameter value.

## Step 3: Update and Run Token Exchange

1. Edit `auth/oauth2-complete-test.bru`
2. Replace the `code` value in the body with your new code
3. Run immediately (codes expire in 10 minutes):

```bash
./node_modules/.bin/bru run auth/oauth2-complete-test.bru --env sandbox
```

## Step 4: Test API with Token

Once you have the access token, test it:

```bash
./node_modules/.bin/bru run test/hello-world.bru --env sandbox
```

## Troubleshooting

### Common Errors:

1. **"code is invalid"** - The authorization code has expired or been used. Get a new one.
2. **"grant_type is required"** - Body format issue. Ensure using `body:form-urlencoded`
3. **401 Unauthorized** - Access token expired. Use refresh token to get new one.

### Token Refresh

When access token expires (after 4 hours), use:

```bash
./node_modules/.bin/bru run auth/refresh-token.bru --env sandbox
```