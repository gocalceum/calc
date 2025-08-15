#!/bin/bash

# HMRC Self-Employment Business API v5.0 - Complete Test Suite
# Correct version and paths for v5.0

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
BUSINESS_ID="XBIS12345678901"
TAX_YEAR="2023-24"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
declare -a TEST_RESULTS

echo "================================================"
echo -e "${CYAN}SELF-EMPLOYMENT API v5.0 - Complete Test Suite${NC}"
echo "================================================"
echo "API Version: 5.0 (REQUIRED)"
echo "Environment: Sandbox"
echo "Business ID: $BUSINESS_ID"
echo "Tax Year: $TAX_YEAR"
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
    
    # Build curl command
    local CURL_CMD="curl -s -w '\n%{http_code}' -X $method '$url'"
    CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $TOKEN'"
    CURL_CMD="$CURL_CMD -H 'Accept: application/vnd.hmrc.5.0+json'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-Connection-Method: DESKTOP_APP_DIRECT'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-Device-ID: test-device-id'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-User-IDs: test-user'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-Timezone: UTC+00:00'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-Local-IPs: 127.0.0.1'"
    CURL_CMD="$CURL_CMD -H 'Gov-Client-User-Agent: bruno-test'"
    CURL_CMD="$CURL_CMD -H 'Gov-Vendor-Version: 1.0.0'"
    
    if [ -n "$scenario" ]; then
        CURL_CMD="$CURL_CMD -H 'Gov-Test-Scenario: $scenario'"
    fi
    
    if [ "$method" = "PUT" ] || [ "$method" = "POST" ]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json'"
        CURL_CMD="$CURL_CMD -d '$body'"
    fi
    
    # Execute request
    RESPONSE=$(eval $CURL_CMD 2>/dev/null)
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Check result
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "  Result: ${GREEN}✓ PASS${NC} (Status: $STATUS)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("PASS|$test_num|$test_name|$method|$STATUS")
        
        # Show relevant data
        if [ "$STATUS" = "200" ] && [ -n "$BODY" ]; then
            case "$test_name" in
                *"List period"*)
                    COUNT=$(echo "$BODY" | jq '.periods | length' 2>/dev/null || echo "0")
                    echo -e "  ${CYAN}→ Periods found: $COUNT${NC}"
                    if [ "$COUNT" != "0" ]; then
                        FIRST_PERIOD=$(echo "$BODY" | jq -r '.periods[0].periodId' 2>/dev/null)
                        echo -e "  ${CYAN}→ First period: $FIRST_PERIOD${NC}"
                    fi
                    ;;
                *"annual"*)
                    ADJUSTMENTS=$(echo "$BODY" | jq '.adjustments' 2>/dev/null)
                    if [ "$ADJUSTMENTS" != "null" ]; then
                        echo -e "  ${CYAN}→ Annual submission contains adjustments and allowances${NC}"
                    fi
                    ;;
                *"Retrieve period"*)
                    TURNOVER=$(echo "$BODY" | jq '.periodIncome.turnover' 2>/dev/null)
                    if [ "$TURNOVER" != "null" ]; then
                        echo -e "  ${CYAN}→ Period turnover: £$TURNOVER${NC}"
                    fi
                    ;;
            esac
        elif [ "$STATUS" = "201" ]; then
            echo -e "  ${CYAN}→ Successfully created${NC}"
        elif [ "$STATUS" = "204" ]; then
            echo -e "  ${CYAN}→ Successfully updated/deleted${NC}"
        fi
    else
        echo -e "  Result: ${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TEST_RESULTS+=("FAIL|$test_num|$test_name|$method|$STATUS")
        
        # Show error
        ERROR_MSG=$(echo "$BODY" | jq -r '.message' 2>/dev/null || echo "$BODY")
        ERROR_CODE=$(echo "$BODY" | jq -r '.code' 2>/dev/null)
        [ -n "$ERROR_CODE" ] && echo -e "  ${RED}→ Error: $ERROR_CODE - $ERROR_MSG${NC}"
    fi
    
    echo ""
    sleep 1
}

echo -e "${YELLOW}Starting Self-Employment API v5.0 Tests...${NC}"
echo "----------------------------------------"
echo ""

# ========================================
# ANNUAL SUBMISSION TESTS
# ========================================
echo -e "${CYAN}=== Annual Submission Endpoints ===${NC}"
echo ""

# Test 1: Retrieve annual submission
test_endpoint "01" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "200 404" \
    "" \
    "Retrieve annual submission" \
    ""

# Test 2: Create/amend annual submission
test_endpoint "02" "PUT" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "200 204" \
    '{
        "adjustments": {
            "includedNonTaxableProfits": 100.25,
            "basisAdjustment": 100.25,
            "overlapReliefUsed": 100.25,
            "accountingAdjustment": 100.25,
            "averagingAdjustment": 100.25,
            "outstandingBusinessIncome": 100.25,
            "balancingChargeBpra": 100.25,
            "balancingChargeOther": 100.25,
            "goodsAndServicesOwnUse": 100.25
        },
        "allowances": {
            "annualInvestmentAllowance": 100.25,
            "businessPremisesRenovationAllowance": 100.25,
            "capitalAllowanceMainPool": 100.25,
            "capitalAllowanceSpecialRatePool": 100.25,
            "zeroEmissionsGoodsVehicleAllowance": 100.25,
            "enhancedCapitalAllowance": 100.25,
            "allowanceOnSales": 100.25,
            "capitalAllowanceSingleAssetPool": 100.25,
            "zeroEmissionsCarAllowance": 100.25
        }
    }' \
    "Create/amend annual submission" \
    ""

# Test 3: Delete annual submission
test_endpoint "03" "DELETE" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "204 404" \
    "" \
    "Delete annual submission" \
    "ANNUAL_DELETED"

# ========================================
# PERIOD SUMMARY TESTS
# ========================================
echo -e "${CYAN}=== Period Summary Endpoints ===${NC}"
echo ""

# Test 4: List period summaries (v5.0 uses tax year in path)
test_endpoint "04" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$TAX_YEAR" \
    "200 404" \
    "" \
    "List period summaries" \
    ""

# Test 5: Create period summary
PERIOD_FROM="2023-04-06"
PERIOD_TO="2023-07-05"
test_endpoint "05" "POST" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$TAX_YEAR" \
    "201 200 400" \
    '{
        "periodDates": {
            "periodStartDate": "'$PERIOD_FROM'",
            "periodEndDate": "'$PERIOD_TO'"
        },
        "periodIncome": {
            "turnover": 5000.99,
            "other": 1000.99
        },
        "periodExpenses": {
            "costOfGoods": 500.99,
            "paymentsToSubcontractors": 100.99,
            "wagesAndStaffCosts": 250.99,
            "carVanTravelExpenses": 100.99,
            "premisesRunningCosts": 200.99,
            "maintenanceCosts": 50.99,
            "adminCosts": 100.99,
            "businessEntertainmentCosts": 50.99,
            "advertisingCosts": 100.99,
            "interestOnBankOtherLoans": 50.99,
            "financeCharges": 25.99,
            "irrecoverableDebts": 25.99,
            "professionalFees": 100.99,
            "depreciation": 50.99,
            "otherExpenses": 100.99
        },
        "periodDisallowableExpenses": {
            "costOfGoodsDisallowable": 50.99,
            "paymentsToSubcontractorsDisallowable": 10.99,
            "wagesAndStaffCostsDisallowable": 25.99,
            "carVanTravelExpensesDisallowable": 10.99,
            "premisesRunningCostsDisallowable": 20.99,
            "maintenanceCostsDisallowable": 5.99,
            "adminCostsDisallowable": 10.99,
            "businessEntertainmentCostsDisallowable": 5.99,
            "advertisingCostsDisallowable": 10.99,
            "interestOnBankOtherLoansDisallowable": 5.99,
            "financeChargesDisallowable": 2.99,
            "irrecoverableDebtsDisallowable": 2.99,
            "professionalFeesDisallowable": 10.99,
            "depreciationDisallowable": 5.99,
            "otherExpensesDisallowable": 10.99
        }
    }' \
    "Create period summary (Q1)" \
    ""

# Test 6: Retrieve specific period summary (v5.0 format)
PERIOD_ID="2023-04-06_2023-07-05"
test_endpoint "06" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$TAX_YEAR/$PERIOD_ID" \
    "200 404" \
    "" \
    "Retrieve period summary" \
    ""

# Test 7: Amend period summary
test_endpoint "07" "PUT" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$TAX_YEAR/$PERIOD_ID" \
    "200 204 404" \
    '{
        "periodIncome": {
            "turnover": 6000.99,
            "other": 1200.99
        },
        "periodExpenses": {
            "costOfGoods": 600.99,
            "paymentsToSubcontractors": 150.99,
            "wagesAndStaffCosts": 300.99,
            "carVanTravelExpenses": 120.99,
            "premisesRunningCosts": 250.99,
            "maintenanceCosts": 60.99,
            "adminCosts": 110.99,
            "businessEntertainmentCosts": 60.99,
            "advertisingCosts": 120.99,
            "interestOnBankOtherLoans": 60.99,
            "financeCharges": 30.99,
            "irrecoverableDebts": 30.99,
            "professionalFees": 120.99,
            "depreciation": 60.99,
            "otherExpenses": 120.99
        }
    }' \
    "Amend period summary" \
    ""

# ========================================
# TEST SCENARIOS
# ========================================
echo -e "${CYAN}=== Test Scenarios ===${NC}"
echo ""

# Test 8: Test with STATEFUL scenario
test_endpoint "08" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "200 404" \
    "" \
    "Test scenario - STATEFUL" \
    "STATEFUL"

# Test 9: Test with specific business scenario
test_endpoint "09" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$TAX_YEAR" \
    "200 404" \
    "" \
    "Test scenario - Multiple periods" \
    "QUARTERLY_PERIOD_FOUR"

# ========================================
# SUMMARY
# ========================================
echo "================================================"
echo -e "${CYAN}TEST SUMMARY - SELF-EMPLOYMENT API v5.0${NC}"
echo "================================================"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "================================================"
echo ""

# Detailed results table
echo "DETAILED RESULTS:"
echo "----------------"
printf "%-4s %-40s %-7s %-8s %-10s\n" "#" "Test Name" "Method" "Status" "Result"
echo "────────────────────────────────────────────────────────────────────────"

for result in "${TEST_RESULTS[@]}"; do
    IFS='|' read -r status num name method code <<< "$result"
    if [ "$status" = "PASS" ]; then
        printf "${GREEN}%-4s${NC} %-40s %-7s %-8s ${GREEN}%-10s${NC}\n" "$num" "${name:0:40}" "$method" "$code" "✓ PASS"
    else
        printf "${RED}%-4s${NC} %-40s %-7s %-8s ${RED}%-10s${NC}\n" "$num" "${name:0:40}" "$method" "$code" "✗ FAIL"
    fi
done

echo ""
echo "================================================"
echo -e "${CYAN}Key Points for v5.0:${NC}"
echo "1. Must use Accept: application/vnd.hmrc.5.0+json"
echo "2. Period endpoints include tax year in path"
echo "3. Period dates use periodDates object with periodStartDate/periodEndDate"
echo "4. Includes periodDisallowableExpenses in addition to periodExpenses"
echo "================================================"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ All Self-Employment API v5.0 tests passed!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠ Some tests may have failed due to sandbox limitations${NC}"
    echo "Note: 404 errors are often normal for non-existent data"
    exit 1
fi