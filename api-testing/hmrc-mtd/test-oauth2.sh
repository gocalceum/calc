#!/bin/bash

# Test OAuth2 token exchange with curl
curl -X POST https://test-api.service.hmrc.gov.uk/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -d "grant_type=authorization_code" \
  -d "client_id=iQetMYZLL2Gq9dmqFTcJGSVMLpxZ" \
  -d "client_secret=3ed60b21-3e72-409e-8fb2-d66a8edb0dc6" \
  -d "code=b0f34167-8b1d-4648-a66a-6fe50eb1cc6b" \
  -d "redirect_uri=https://oauth.pstmn.io/v1/callback" \
  -v