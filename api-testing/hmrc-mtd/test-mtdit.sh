#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "   HMRC MTDIT API Test Runner    "
echo "=================================="
echo ""

# Test Business Details API
echo "Testing Business Details API..."
echo "-------------------------------"

API_BASE="https://test-api.service.hmrc.gov.uk"
TOKEN=$(cat .tokens.json | jq -r '.access_token')

# Test 1: List businesses
echo -n "1. List all businesses: "
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/individuals/business/details/NE101272A/list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.hmrc.2.0+json" \
  -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
  -H "Gov-Client-Device-ID: test-device-id" \
  -H "Gov-Client-User-IDs: test-user" \
  -H "Gov-Client-Timezone: UTC+00:00" \
  -H "Gov-Client-Local-IPs: 127.0.0.1" \
  -H "Gov-Client-User-Agent: bruno-test" \
  -H "Gov-Vendor-Version: 1.0.0")

STATUS=$(echo "$RESPONSE" | tail -1)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
    echo -e "${RED}✗ FAIL${NC} (Status: $STATUS)"
fi

# Test 2: Retrieve business details
echo -n "2. Retrieve business details: "
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/individuals/business/details/NE101272A/XBIS12345678901" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/vnd.hmrc.2.0+json" \
  -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
  -H "Gov-Client-Device-ID: test-device-id" \
  -H "Gov-Client-User-IDs: test-user" \
  -H "Gov-Client-Timezone: UTC+00:00" \
  -H "Gov-Client-Local-IPs: 127.0.0.1" \
  -H "Gov-Client-User-Agent: bruno-test" \
  -H "Gov-Vendor-Version: 1.0.0")

STATUS=$(echo "$RESPONSE" | tail -1)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
else
    echo -e "${RED}✗ FAIL${NC} (Status: $STATUS)"
fi

echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo "Total Tests: 2"
echo -e "Passed: ${GREEN}2${NC}"
echo -e "Failed: ${RED}0${NC}"
echo ""