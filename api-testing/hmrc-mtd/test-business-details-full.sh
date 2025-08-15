#!/bin/bash

# HMRC Business Details API - Complete Test Suite
# Based on MTDIT Phase 1 Requirements
# Total Required Endpoints: 10

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Configuration
TOKEN=$(cat .tokens.json | jq -r '.access_token')
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
BUSINESS_ID="XBIS12345678901"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="business-details-report-$(date '+%Y%m%d-%H%M%S').html"

# Test results array
declare -a TEST_RESULTS

echo "================================================"
echo -e "${CYAN}   BUSINESS DETAILS API - Complete Test Suite${NC}"
echo "================================================"
echo "API Version: 1.0"
echo "Environment: Sandbox"
echo "Timestamp: $TIMESTAMP"
echo "================================================"
echo ""

# Function to test endpoint
test_endpoint() {
    local test_num=$1
    local method=$2
    local url=$3
    local expected=$4
    local body=$5
    local test_name=$6
    local scenario=$7
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Test #$test_num:${NC} $test_name"
    echo -e "  Method: $method"
    echo -e "  URL: $(echo $url | sed "s|$API_BASE||")"
    [ -n "$scenario" ] && echo -e "  Scenario: $scenario"
    
    # Build curl command based on method
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
            -H "Gov-Vendor-Version: 1.0.0" \
            ${scenario:+-H "Gov-Test-Scenario: $scenario"} 2>/dev/null)
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
            ${scenario:+-H "Gov-Test-Scenario: $scenario"} \
            -d "$body" 2>/dev/null)
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
            -H "Gov-Vendor-Version: 1.0.0" \
            ${scenario:+-H "Gov-Test-Scenario: $scenario"} 2>/dev/null)
    fi
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Store result
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "  Result: ${GREEN}✓ PASS${NC} (Status: $STATUS)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("PASS|$test_num|$test_name|$method|$STATUS|$scenario")
        
        # Show key response data
        if [ "$STATUS" = "200" ] && [ -n "$BODY" ]; then
            # Extract key information based on endpoint
            case "$test_name" in
                *"List all businesses"*)
                    COUNT=$(echo "$BODY" | jq '.listOfBusinesses | length' 2>/dev/null || echo "0")
                    echo -e "  ${CYAN}→ Businesses found: $COUNT${NC}"
                    ;;
                *"business details"*)
                    TRADING_NAME=$(echo "$BODY" | jq -r '.tradingName' 2>/dev/null || echo "N/A")
                    TYPE=$(echo "$BODY" | jq -r '.typeOfBusiness' 2>/dev/null || echo "N/A")
                    echo -e "  ${CYAN}→ Trading Name: $TRADING_NAME, Type: $TYPE${NC}"
                    ;;
                *"accounting type"*)
                    ACC_TYPE=$(echo "$BODY" | jq -r '.accountingType' 2>/dev/null || echo "N/A")
                    echo -e "  ${CYAN}→ Accounting Type: $ACC_TYPE${NC}"
                    ;;
                *"periods"*)
                    PERIODS=$(echo "$BODY" | jq '.periodsOfAccountDates | length' 2>/dev/null || echo "0")
                    echo -e "  ${CYAN}→ Periods defined: $PERIODS${NC}"
                    ;;
            esac
        fi
    else
        echo -e "  Result: ${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("FAIL|$test_num|$test_name|$method|$STATUS|$scenario")
        
        # Show error message
        ERROR_MSG=$(echo "$BODY" | jq -r '.message' 2>/dev/null || echo "$BODY")
        [ -n "$ERROR_MSG" ] && echo -e "  ${RED}→ Error: $ERROR_MSG${NC}"
    fi
    
    echo ""
    sleep 1  # Rate limiting
}

# ========================================
# RUN ALL 10 REQUIRED TESTS
# ========================================

echo -e "${YELLOW}Starting Business Details API Tests...${NC}"
echo "----------------------------------------"
echo ""

# Test 1: List all businesses (DEFAULT)
test_endpoint "01" "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200" \
    "" \
    "List all businesses (DEFAULT)" \
    ""

# Test 2: Retrieve business details
test_endpoint "02" "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID" \
    "200" \
    "" \
    "Retrieve business details" \
    ""

# Test 3: Create/amend quarterly period type
test_endpoint "03" "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" \
    "200 204" \
    '{"quarterlyPeriodType":"standard"}' \
    "Create/amend quarterly period type" \
    ""

# Test 4: Retrieve accounting type
test_endpoint "04" "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 404" \
    "" \
    "Retrieve accounting type" \
    ""

# Test 5: Update accounting type
test_endpoint "05" "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 204" \
    '{"accountingType":"ACCRUAL"}' \
    "Update accounting type" \
    ""

# Test 6: Retrieve periods of account
test_endpoint "06" "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" \
    "200 404" \
    "" \
    "Retrieve periods of account" \
    ""

# Test 7: Create/update periods of account
# Note: This may fail with 400 if periods already exist (sandbox limitation)
test_endpoint "07" "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" \
    "200 204" \
    '{"periodsOfAccount":[{"startDate":"2025-04-06","endDate":"2026-04-05"}]}' \
    "Create/update periods of account" \
    ""

# Test 8: Test scenario - Multiple businesses
test_endpoint "08" "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200" \
    "" \
    "Test scenario - Multiple businesses" \
    "BUSINESS_AND_PROPERTY"

# Test 9: Test scenario - No businesses found
test_endpoint "09" "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200 404" \
    "" \
    "Test scenario - No businesses found" \
    "NOT_FOUND"

# Test 10: Test scenario - STATEFUL
test_endpoint "10" "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200" \
    "" \
    "Test scenario - STATEFUL" \
    "STATEFUL"

# ========================================
# GENERATE SUMMARY
# ========================================

echo "================================================"
echo -e "${CYAN}TEST SUMMARY - BUSINESS DETAILS API${NC}"
echo "================================================"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "================================================"
echo ""

# Show detailed results table
echo "DETAILED RESULTS:"
echo "----------------"
printf "%-4s %-40s %-7s %-8s %-15s\n" "#" "Test Name" "Method" "Status" "Result"
echo "────────────────────────────────────────────────────────────────────────"

for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r status num name method code scenario <<< "$result"
    if [ "$status" = "PASS" ]; then
        printf "${GREEN}%-4s${NC} %-40s %-7s %-8s ${GREEN}%-15s${NC}\n" "$num" "${name:0:40}" "$method" "$code" "✓ PASS"
    else
        printf "${RED}%-4s${NC} %-40s %-7s %-8s ${RED}%-15s${NC}\n" "$num" "${name:0:40}" "$method" "$code" "✗ FAIL"
    fi
done

echo ""
echo "================================================"
echo -e "${CYAN}Test completed at $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo "================================================"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All Business Details API tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please review the results above.${NC}"
    exit 1
fi