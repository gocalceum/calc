#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================"
echo "      Obligations API - Complete Test      "
echo "============================================"
echo ""

# Load token
TOKEN=$(cat .tokens.json | jq -r '.access_token')
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
BUSINESS_ID="XBIS12345678901"

# Function to make API call and check status
test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local test_name=$4
    local scenario=$5
    
    echo -n "$test_name: "
    
    if [ -n "$scenario" ]; then
        SCENARIO_HEADER="-H \"Gov-Test-Scenario: $scenario\""
    else
        SCENARIO_HEADER=""
    fi
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$url" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.hmrc.2.0+json" \
        ${SCENARIO_HEADER:+$SCENARIO_HEADER} \
        -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
        -H "Gov-Client-Device-ID: test-device-id" \
        -H "Gov-Client-User-IDs: test-user" \
        -H "Gov-Client-Timezone: UTC+00:00" \
        -H "Gov-Client-Local-IPs: 127.0.0.1" \
        -H "Gov-Client-User-Agent: bruno-test" \
        -H "Gov-Vendor-Version: 1.0.0")
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $STATUS)"
        if [ "$STATUS" = "200" ]; then
            # Count obligations
            COUNT=$(echo $BODY | jq '.obligations | length' 2>/dev/null || echo "0")
            echo "  Obligations found: $COUNT"
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        echo "  Error: $(echo $BODY | jq -c '.' 2>/dev/null || echo $BODY)"
    fi
    echo ""
    sleep 1
}

echo -e "${BLUE}Starting Obligations API Tests...${NC}"
echo "========================================="
echo ""

# Test 1: Retrieve Income & Expenditure obligations (Quarterly)
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "1. Income & Expenditure obligations (2023-24)" \
    ""

# Test 2: Retrieve Final Declaration obligations
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/crystallised?from=2023-04-06&to=2024-04-05" \
    "200" \
    "2. Final Declaration obligations (2023-24)" \
    ""

# Test 3: Retrieve End of Period Statement obligations
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/end-of-period-statement?from=2023-04-06&to=2024-04-05" \
    "200" \
    "3. End of Period Statement obligations (2023-24)" \
    ""

# Test 4: Income & Expenditure for specific business
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05&typeOfBusiness=self-employment&businessId=$BUSINESS_ID" \
    "200" \
    "4. Income & Expenditure for business (2023-24)" \
    ""

# Test 5: Test with QUARTERLY_ONE scenario
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "5. Income & Expenditure (QUARTERLY_ONE scenario)" \
    "QUARTERLY_ONE"

# Test 6: Test with QUARTERLY_TWO scenario
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "6. Income & Expenditure (QUARTERLY_TWO scenario)" \
    "QUARTERLY_TWO"

# Test 7: Test with QUARTERLY_THREE scenario
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "7. Income & Expenditure (QUARTERLY_THREE scenario)" \
    "QUARTERLY_THREE"

# Test 8: Test with QUARTERLY_FOUR scenario
test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "8. Income & Expenditure (QUARTERLY_FOUR scenario)" \
    "QUARTERLY_FOUR"

echo "========================================="
echo -e "${BLUE}Test Summary Complete${NC}"
echo "========================================="