#!/bin/bash

# Supabase Management API script to configure SMTP settings
# This allows SMTP configuration via environment variables instead of dashboard

set -e

# Check required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN environment variable is required"
  echo "Get your access token from: https://supabase.com/dashboard/account/tokens"
  exit 1
fi

if [ -z "$RESEND_API_KEY" ]; then
  echo "Error: RESEND_API_KEY environment variable is required"
  exit 1
fi

PROJECT_REF="ducrwfvylwdaqpwfbdub"
SMTP_HOST="smtp.resend.com"
SMTP_PORT="587"
SMTP_USER="resend"
SMTP_FROM_EMAIL="noreply@calceum.com"
SMTP_FROM_NAME="Calceum"

echo "Configuring SMTP for project: $PROJECT_REF"

# Update auth configuration with SMTP settings
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"external_email_enabled\": true,
    \"smtp_host\": \"$SMTP_HOST\",
    \"smtp_port\": \"$SMTP_PORT\",
    \"smtp_user\": \"$SMTP_USER\",
    \"smtp_pass\": \"$RESEND_API_KEY\",
    \"smtp_sender_email\": \"$SMTP_FROM_EMAIL\",
    \"smtp_sender_name\": \"$SMTP_FROM_NAME\",
    \"smtp_max_frequency\": 30,
    \"mailer_autoconfirm\": false,
    \"external_phone_enabled\": false
  }" | jq '.'

echo ""
echo "SMTP configuration updated successfully!"
echo "Note: Changes may take a few minutes to propagate"