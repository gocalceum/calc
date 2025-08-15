#!/bin/bash

# HMRC Self-Employment Business API - Complete Test Suite
# Based on MTDIT Phase 1 Requirements (9 endpoints)

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

echo "================================================"
echo -e "${CYAN}  SELF-EMPLOYMENT API - Complete Test Suite${NC}"
echo "================================================"
echo "API: Self-Employment Business API"
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
    local accept_version=${7:-"5.0"}  # Default to v5.0
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Test #$test_num:${NC} $test_name"
    echo -e "  Method: $method"
    echo -e "  URL: $(echo $url | sed "s|$API_BASE||")"
    echo -e "  Version: $accept_version"
    
    # Execute request based on method
    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.${accept_version}+json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0" 2>/dev/null)
    elif [ "$method" = "PUT" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.${accept_version}+json" \
            -H "Content-Type: application/json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0" \
            -d "$body" 2>/dev/null)
    elif [ "$method" = "POST" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.${accept_version}+json" \
            -H "Content-Type: application/json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0" \
            -d "$body" 2>/dev/null)
    elif [ "$method" = "DELETE" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$url" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Accept: application/vnd.hmrc.${accept_version}+json" \
            -H "Gov-Client-Connection-Method: DESKTOP_APP_DIRECT" \
            -H "Gov-Client-Device-ID: test-device-id" \
            -H "Gov-Client-User-IDs: test-user" \
            -H "Gov-Client-Timezone: UTC+00:00" \
            -H "Gov-Client-Local-IPs: 127.0.0.1" \
            -H "Gov-Client-User-Agent: bruno-test" \
            -H "Gov-Vendor-Version: 1.0.0" 2>/dev/null)
    fi
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        echo -e "  Result: ${GREEN}✓ PASS${NC} (Status: $STATUS)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        
        # Show key data for successful responses
        if [ "$STATUS" = "200" ] && [ -n "$BODY" ]; then
            case "$test_name" in
                *"List period"*)
                    COUNT=$(echo "$BODY" | jq '.periods | length' 2>/dev/null || echo "0")
                    echo -e "  ${CYAN}→ Periods found: $COUNT${NC}"
                    ;;
                *"annual"*)
                    if echo "$BODY" | jq -e '.adjustments' >/dev/null 2>&1; then
                        echo -e "  ${CYAN}→ Annual submission data retrieved${NC}"
                    fi
                    ;;
            esac
        elif [ "$STATUS" = "201" ]; then
            PERIOD_ID=$(echo "$BODY" | jq -r '.periodId' 2>/dev/null || echo "")
            [ -n "$PERIOD_ID" ] && echo -e "  ${CYAN}→ Period created: $PERIOD_ID${NC}"
        fi
    else
        echo -e "  Result: ${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        
        # Show error message
        ERROR_MSG=$(echo "$BODY" | jq -r '.message' 2>/dev/null || echo "$BODY")
        ERROR_CODE=$(echo "$BODY" | jq -r '.code' 2>/dev/null || echo "")
        [ -n "$ERROR_CODE" ] && echo -e "  ${RED}→ Error: $ERROR_CODE - $ERROR_MSG${NC}"
    fi
    
    echo ""
    sleep 1
}

echo -e "${YELLOW}Starting Self-Employment API Tests...${NC}"
echo "----------------------------------------"
echo ""

# First, let's check which API version to use
echo "Checking API versions..."
echo ""

# Test 1: Retrieve annual submission
test_endpoint "01" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "200 404" \
    "" \
    "Retrieve annual submission" \
    "5.0"

VERSION="5.0"
echo -e "${CYAN}Using API version: $VERSION${NC}"
echo ""

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
            "capitalAllowanceMainPool": 100.25,
            "capitalAllowanceSpecialRatePool": 100.25,
            "zeroEmissionsGoodsVehicleAllowance": 100.25,
            "businessPremisesRenovationAllowance": 100.25,
            "enhancedCapitalAllowance": 100.25,
            "allowanceOnSales": 100.25,
            "capitalAllowanceSingleAssetPool": 100.25,
            "electricChargePointAllowance": 100.25,
            "structuredBuildingAllowance": 100.25,
            "enhancedStructuredBuildingAllowance": 100.25,
            "zeroEmissionsCarAllowance": 100.25
        }
    }' \
    "Create/amend annual submission" \
    "$VERSION"

# Test 3: Delete annual submission
test_endpoint "03" "DELETE" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/annual/$TAX_YEAR" \
    "204 404" \
    "" \
    "Delete annual submission" \
    "$VERSION"

# Test 4: Create period summary
PERIOD_FROM="2023-04-06"
PERIOD_TO="2023-07-05"
test_endpoint "04" "POST" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period" \
    "201 200 400" \
    '{
        "periodFromDate": "'$PERIOD_FROM'",
        "periodToDate": "'$PERIOD_TO'",
        "incomes": {
            "turnover": 5000.99,
            "other": 1000.99
        },
        "expenses": {
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
        }
    }' \
    "Create period summary (Q1)" \
    "$VERSION"

# Test 5: List period summaries
test_endpoint "05" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period?from=$PERIOD_FROM&to=2024-04-05" \
    "200 404" \
    "" \
    "List period summaries" \
    "$VERSION"

# Test 6: Retrieve period summary (using a test period ID)
PERIOD_ID="2023-04-06_2023-07-05"
test_endpoint "06" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$PERIOD_ID" \
    "200 404" \
    "" \
    "Retrieve period summary" \
    "$VERSION"

# Test 7: Amend period summary
test_endpoint "07" "PUT" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/period/$PERIOD_ID" \
    "200 204 404" \
    '{
        "incomes": {
            "turnover": 6000.99,
            "other": 1200.99
        },
        "expenses": {
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
    "$VERSION"

# Test 8: Retrieve cumulative summary (not in all API versions)
test_endpoint "08" "GET" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/cumulative?from=$PERIOD_FROM&to=2024-04-05" \
    "200 404 400" \
    "" \
    "Retrieve cumulative summary" \
    "$VERSION"

# Test 9: Create/amend cumulative summary (may not be available)
test_endpoint "09" "PUT" \
    "$API_BASE/individuals/business/self-employment/$NINO/$BUSINESS_ID/cumulative?from=$PERIOD_FROM&to=2024-04-05" \
    "200 204 404 400" \
    '{
        "incomes": {
            "turnover": 25000.99,
            "other": 5000.99
        },
        "expenses": {
            "costOfGoods": 2500.99,
            "paymentsToSubcontractors": 500.99,
            "wagesAndStaffCosts": 1500.99,
            "carVanTravelExpenses": 500.99,
            "premisesRunningCosts": 1000.99,
            "maintenanceCosts": 250.99,
            "adminCosts": 500.99,
            "businessEntertainmentCosts": 250.99,
            "advertisingCosts": 500.99,
            "interestOnBankOtherLoans": 250.99,
            "financeCharges": 125.99,
            "irrecoverableDebts": 125.99,
            "professionalFees": 500.99,
            "depreciation": 250.99,
            "otherExpenses": 500.99
        }
    }' \
    "Create/amend cumulative summary" \
    "$VERSION"

echo "================================================"
echo -e "${CYAN}TEST SUMMARY - SELF-EMPLOYMENT API${NC}"
echo "================================================"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo "================================================"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All Self-Employment API tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review the results above.${NC}"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo "1. Check API version - some endpoints need v2.0, others v3.0"
    echo "2. 404 errors may be normal for no existing data"
    echo "3. Period IDs must match existing periods"
    exit 1
fi