#!/bin/bash

# HMRC Obligations API v3.0 - Complete Test Suite
# Correct version header required: application/vnd.hmrc.3.0+json

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TOKEN=$(cat .tokens.json | jq -r '.access_token')
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "================================================"
echo -e "${CYAN}   OBLIGATIONS API v3.0 - Complete Test Suite${NC}"
echo "================================================"
echo "API Version: 3.0 (IMPORTANT: v2.0 returns 403)"
echo "Environment: Sandbox"
echo "Timestamp: $TIMESTAMP"
echo "================================================"
echo ""

# Function to test endpoint
test_endpoint() {
    local test_num=$1
    local url=$2
    local expected=$3
    local test_name=$4
    local scenario=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Test #$test_num:${NC} $test_name"
    echo -e "  URL: $(echo $url | sed "s|$API_BASE||" | cut -d'?' -f1)"
    [ -n "$scenario" ] && echo -e "  Scenario: $scenario"
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$url" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.hmrc.3.0+json" \
        -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
        -H "Gov-Client-Device-ID: test-device-id" \
        -H "Gov-Client-User-IDs: test-user" \
        -H "Gov-Client-Timezone: UTC+00:00" \
        -H "Gov-Client-Local-IPs: 127.0.0.1" \
        -H "Gov-Client-User-Agent: bruno-test" \
        -H "Gov-Vendor-Version: 1.0.0" \
        ${scenario:+-H "Gov-Test-Scenario: $scenario"} 2>/dev/null)
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "  Result: ${GREEN}✓ PASS${NC} (Status: $STATUS)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Show obligation counts
        if [ "$STATUS" = "200" ] && [ -n "$BODY" ]; then
            OBLIGATION_COUNT=$(echo "$BODY" | jq '.obligations | length' 2>/dev/null || echo "0")
            if [ "$OBLIGATION_COUNT" != "0" ]; then
                echo -e "  ${CYAN}→ Obligations found: $OBLIGATION_COUNT${NC}"
                
                # Show status breakdown
                FULFILLED=$(echo "$BODY" | jq '[.obligations[].obligationDetails[] | select(.status=="fulfilled")] | length' 2>/dev/null || echo "0")
                OPEN=$(echo "$BODY" | jq '[.obligations[].obligationDetails[] | select(.status=="open")] | length' 2>/dev/null || echo "0")
                echo -e "  ${CYAN}→ Status: $FULFILLED fulfilled, $OPEN open${NC}"
            fi
        elif [ "$STATUS" = "404" ]; then
            echo -e "  ${CYAN}→ No obligations found (expected)${NC}"
        fi
    else
        echo -e "  Result: ${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        # Show error
        ERROR_MSG=$(echo "$BODY" | jq -r '.message' 2>/dev/null || echo "$BODY")
        [ -n "$ERROR_MSG" ] && echo -e "  ${RED}→ Error: $ERROR_MSG${NC}"
    fi
    
    echo ""
    sleep 1
}

echo -e "${YELLOW}Starting Obligations API v3.0 Tests...${NC}"
echo "----------------------------------------"
echo ""

# Test 1: Income & Expenditure obligations (current year)
test_endpoint "01" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "Income & Expenditure obligations (2023-24)" \
    ""

# Test 2: Income & Expenditure with business filter
test_endpoint "02" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05&typeOfBusiness=self-employment&businessId=XBIS12345678901" \
    "200" \
    "Income & Expenditure for specific business" \
    ""

# Test 3: Crystallised obligations (Final Declaration)
test_endpoint "03" \
    "$API_BASE/obligations/details/$NINO/crystallised?from=2023-04-06&to=2024-04-05" \
    "200 404" \
    "Crystallised obligations (2023-24)" \
    ""

# Test 4: End of Period Statement obligations
test_endpoint "04" \
    "$API_BASE/obligations/details/$NINO/end-of-period-statement?from=2023-04-06&to=2024-04-05" \
    "200" \
    "End of Period Statement obligations (2023-24)" \
    ""

# Test 5: Test scenario - QUARTERLY_NONE (no obligations)
test_endpoint "05" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200 404" \
    "Test: No quarterly obligations" \
    "QUARTERLY_NONE"

# Test 6: Test scenario - QUARTERLY_ONE (1 obligation)
test_endpoint "06" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "Test: Single quarterly obligation" \
    "QUARTERLY_ONE"

# Test 7: Test scenario - QUARTERLY_FOUR (4 obligations)
test_endpoint "07" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "Test: Full year quarterly obligations" \
    "QUARTERLY_FOUR"

echo "================================================"
echo -e "${CYAN}TEST SUMMARY - OBLIGATIONS API v3.0${NC}"
echo "================================================"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "================================================"
echo ""

# Important notes
echo -e "${YELLOW}IMPORTANT NOTES:${NC}"
echo "1. This API requires version 3.0 in Accept header"
echo "2. Version 2.0 returns 403 RESOURCE_FORBIDDEN"
echo "3. 404 responses for crystallised are normal (no data)"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All Obligations API v3.0 tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review the results above.${NC}"
    exit 1
fi