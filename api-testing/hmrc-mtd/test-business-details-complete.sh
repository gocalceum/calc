#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================"
echo "   Business Details API - Complete Test    "
echo "============================================"
echo ""

# Load token
TOKEN=$(cat .tokens.json | jq -r '.access_token')
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
BUSINESS_ID="XBIS12345678901"

# Common headers
get_headers() {
    echo "-H \"Authorization: Bearer $TOKEN\" \
-H \"Accept: application/vnd.hmrc.2.0+json\" \
-H \"Gov-Client-Connection-Method: DESKTOP_APP_DIRECT\" \
-H \"Gov-Client-Device-ID: test-device-id\" \
-H \"Gov-Client-User-IDs: test-user\" \
-H \"Gov-Client-Timezone: UTC+00:00\" \
-H \"Gov-Client-Local-IPs: 127.0.0.1\" \
-H \"Gov-Client-User-Agent: bruno-test\" \
-H \"Gov-Vendor-Version: 1.0.0\""
}

# Function to make API call and check status
test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local body=$4
    local test_name=$5
    
    echo -n "$test_name: "
    
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.2.0+json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0")
    elif [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.2.0+json" \
            -H "Content-Type: application/json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0" \
            -d "$body")
    elif [ "$method" = "DELETE" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.2.0+json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0")
    fi
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
        if [ "$STATUS" != "204" ] && [ "$STATUS" != "404" ]; then
            echo "  Response: $(echo $BODY | jq -c '.' 2>/dev/null || echo $BODY | head -c 100)"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        echo "  Error: $(echo $BODY | jq -c '.' 2>/dev/null || echo $BODY)"
    fi
    echo ""
    sleep 1  # Add delay to avoid rate limits
}

echo -e "${BLUE}Starting Business Details API Tests...${NC}"
echo "========================================="
echo ""

# Test 1: List all businesses (DEFAULT scenario)
test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200" \
    "" \
    "1. List all businesses (DEFAULT)"

# Test 2: Get specific business details
test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID" \
    "200" \
    "" \
    "2. Get business details"

# Test 3: Create/amend quarterly period type (2023-24)
test_endpoint "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" \
    "200 204" \
    '{"quarterlyPeriodType":"standard"}' \
    "3. Create/amend quarterly period (2023-24)"

# Test 4: Retrieve quarterly period type (2023-24)
test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" \
    "200 404" \
    "" \
    "4. Retrieve quarterly period (2023-24)"

# Test 5: Update accounting type (2024-25)
test_endpoint "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 204" \
    '{"accountingType":"ACCRUAL"}' \
    "5. Update accounting type (2024-25)"

# Test 6: Retrieve accounting type (2024-25)
test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 404" \
    "" \
    "6. Retrieve accounting type (2024-25)"

# Test 7: Create/update periods of account (2025-26)
test_endpoint "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" \
    "200 204" \
    '{"periodsOfAccount":[{"startDate":"2025-04-06","endDate":"2026-04-05"}]}' \
    "7. Create periods of account (2025-26)"

# Test 8: Retrieve periods of account (2025-26)
test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" \
    "200 404" \
    "" \
    "8. Retrieve periods of account (2025-26)"

# Test 9: Delete periods of account (2025-26)
test_endpoint "DELETE" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" \
    "204 404" \
    "" \
    "9. Delete periods of account (2025-26)"

# Test 10: List all businesses with STATEFUL scenario
echo -n "10. List businesses (STATEFUL): "
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/individuals/business/details/$NINO/list" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/vnd.hmrc.2.0+json" \
    -H "Gov-Test-Scenario: STATEFUL" \
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
echo "========================================="
echo -e "${BLUE}Test Summary Complete${NC}"
echo "========================================="