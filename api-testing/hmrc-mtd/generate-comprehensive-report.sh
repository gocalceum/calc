#!/bin/bash

# Comprehensive HMRC MTDIT API Test Report Generator
# Generates a complete dashboard for all Phase 1 APIs

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TOKEN=$(cat .tokens.json | jq -r '.access_token' 2>/dev/null || echo "")
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
BUSINESS_ID="XBIS12345678901"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="mtdit-dashboard-$(date '+%Y%m%d-%H%M%S').html"

# Initialize API counters
declare -A API_STATS
API_STATS["business_details_total"]=10
API_STATS["business_details_passed"]=0
API_STATS["business_details_failed"]=0

API_STATS["obligations_total"]=3
API_STATS["obligations_passed"]=0
API_STATS["obligations_failed"]=0

API_STATS["self_employment_total"]=9
API_STATS["self_employment_passed"]=0
API_STATS["self_employment_failed"]=0

API_STATS["property_total"]=30
API_STATS["property_passed"]=0
API_STATS["property_failed"]=0

API_STATS["bsas_total"]=8
API_STATS["bsas_passed"]=0
API_STATS["bsas_failed"]=0

API_STATS["calculations_total"]=4
API_STATS["calculations_passed"]=0
API_STATS["calculations_failed"]=0

API_STATS["losses_total"]=11
API_STATS["losses_passed"]=0
API_STATS["losses_failed"]=0

TOTAL_TESTS=0
TOTAL_PASSED=0
TOTAL_FAILED=0

# HTML content accumulator
API_TEST_RESULTS=""

# Function to escape HTML
escape_html() {
    echo "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

# Function to test endpoint and generate HTML
test_api_endpoint() {
    local api_name=$1
    local test_num=$2
    local method=$3
    local url=$4
    local expected=$5
    local body=$6
    local test_name=$7
    local scenario=$8
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -e "${BLUE}Testing:${NC} [$api_name] $test_name"
    
    # Execute request
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
    fi
    
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Update stats
    local api_key="${api_name}_passed"
    local api_fail="${api_name}_failed"
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        API_STATS[$api_key]=$((API_STATS[$api_key] + 1))
        TOTAL_PASSED=$((TOTAL_PASSED + 1))
        local result_class="success"
        local result_icon="✓"
        echo -e "  ${GREEN}✓ PASS${NC} (Status: $STATUS)"
    else
        API_STATS[$api_fail]=$((API_STATS[$api_fail] + 1))
        TOTAL_FAILED=$((TOTAL_FAILED + 1))
        local result_class="danger"
        local result_icon="✗"
        echo -e "  ${RED}✗ FAIL${NC} (Status: $STATUS)"
    fi
    
    # Format response for HTML
    local formatted_body=$(echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY")
    local escaped_body=$(escape_html "$formatted_body")
    
    # Build HTML row
    API_TEST_RESULTS="$API_TEST_RESULTS
    <tr class='test-row $result_class' data-api='$api_name'>
        <td class='test-num'>$test_num</td>
        <td class='test-name'>$test_name</td>
        <td><span class='badge badge-$method'>$method</span></td>
        <td class='url-cell'><code>$(echo $url | sed "s|$API_BASE||")</code></td>
        <td><span class='badge badge-status-$STATUS'>$STATUS</span></td>
        <td class='result-cell'>
            <span class='result-icon $result_class'>$result_icon</span>
        </td>
        <td>
            <button class='btn-details' onclick='toggleDetails(this)'>Details</button>
        </td>
    </tr>
    <tr class='details-row' style='display:none;'>
        <td colspan='7'>
            <div class='details-content'>
                ${scenario:+<div class='scenario'>Scenario: $scenario</div>}
                ${body:+<div class='request-body'><strong>Request:</strong><pre>$(escape_html "$body")</pre></div>}
                <div class='response-body'><strong>Response:</strong><pre>$escaped_body</pre></div>
            </div>
        </td>
    </tr>"
    
    sleep 1
}

# Start HTML generation
cat > "$REPORT_FILE" << 'HTML_HEADER'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HMRC MTDIT API Test Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f7fa;
            color: #333;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header .subtitle { opacity: 0.9; }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .summary-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border-left: 4px solid #667eea;
            transition: transform 0.2s;
        }
        
        .summary-card:hover { transform: translateY(-2px); }
        
        .summary-card h3 {
            font-size: 18px;
            margin-bottom: 15px;
            color: #667eea;
        }
        
        .api-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        
        .api-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .api-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        
        .api-card.active {
            border: 2px solid #667eea;
            background: #f8f9ff;
        }
        
        .api-card h4 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #555;
        }
        
        .api-progress {
            background: #e9ecef;
            border-radius: 10px;
            height: 8px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .api-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            transition: width 0.3s;
        }
        
        .api-stats {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .tests-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            margin: 30px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 500;
        }
        
        td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        tr:hover { background: #f8f9fa; }
        
        .test-num {
            font-weight: bold;
            color: #667eea;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-GET { background: #e3f2fd; color: #1976d2; }
        .badge-PUT { background: #fff3e0; color: #f57c00; }
        .badge-POST { background: #e8f5e9; color: #388e3c; }
        .badge-DELETE { background: #ffebee; color: #c62828; }
        
        .badge-status-200, .badge-status-204 { background: #c8e6c9; color: #2e7d32; }
        .badge-status-400, .badge-status-404 { background: #ffcdd2; color: #c62828; }
        .badge-status-403 { background: #ffe0b2; color: #e65100; }
        
        .result-icon {
            font-size: 18px;
            font-weight: bold;
        }
        
        .result-icon.success { color: #48bb78; }
        .result-icon.danger { color: #f56565; }
        
        .btn-details {
            background: #667eea;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        
        .btn-details:hover { background: #5a67d8; }
        
        .details-row td {
            background: #f8f9fa;
            padding: 0;
        }
        
        .details-content {
            padding: 20px;
        }
        
        .details-content pre {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.5;
            margin-top: 10px;
        }
        
        .filter-bar {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .filter-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #e9ecef;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .filter-btn:hover { background: #f8f9fa; }
        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .overall-progress {
            background: white;
            border-radius: 10px;
            padding: 30px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .progress-bar {
            background: #e9ecef;
            border-radius: 10px;
            height: 30px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 0.5s;
        }
        
        @media (max-width: 768px) {
            .api-grid { grid-template-columns: 1fr; }
            .summary-grid { grid-template-columns: 1fr; }
            
            table { font-size: 12px; }
            th, td { padding: 8px; }
            .url-cell { font-size: 10px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>🚀 HMRC MTDIT API Test Dashboard</h1>
            <div class="subtitle">
                Phase 1 API Testing - Complete Suite<br>
                Generated: <span id="timestamp">TIMESTAMP_PLACEHOLDER</span>
            </div>
        </div>
    </div>
    
    <div class="container">
        <div class="summary-grid">
            <div class="summary-card">
                <h3>📊 Overall Progress</h3>
                <div style="font-size: 32px; font-weight: bold; color: #667eea;">
                    <span id="overall-percentage">0</span>%
                </div>
                <div style="margin-top: 10px;">
                    <div id="total-tests">Total: 0/75</div>
                    <div id="total-passed" style="color: #48bb78;">Passed: 0</div>
                    <div id="total-failed" style="color: #f56565;">Failed: 0</div>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>⚡ API Coverage</h3>
                <div style="font-size: 24px; font-weight: bold;">
                    <span id="api-coverage">0/7</span> APIs Tested
                </div>
                <div style="margin-top: 10px; color: #666;">
                    Required for Phase 1 compliance
                </div>
            </div>
            
            <div class="summary-card">
                <h3>🎯 Test Status</h3>
                <div id="test-status" style="font-size: 18px; font-weight: bold; color: #f56565;">
                    IN PROGRESS
                </div>
                <div style="margin-top: 10px; color: #666;">
                    Environment: Sandbox
                </div>
            </div>
        </div>
        
        <div class="api-grid">
HTML_HEADER

echo "$TIMESTAMP" | sed 's/&/\&amp;/g' > /tmp/timestamp.txt

echo ""
echo "================================================"
echo -e "${CYAN}Generating MTDIT Phase 1 Dashboard${NC}"
echo "================================================"
echo ""

# Test Business Details API
echo -e "${BLUE}Testing Business Details API (10 endpoints)...${NC}"
test_api_endpoint "business_details" "01" "GET" "$API_BASE/individuals/business/details/$NINO/list" "200" "" "List all businesses" ""
test_api_endpoint "business_details" "02" "GET" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID" "200" "" "Retrieve business details" ""
test_api_endpoint "business_details" "03" "PUT" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" "200 204" '{"quarterlyPeriodType":"standard"}' "Create/amend quarterly period type" ""
test_api_endpoint "business_details" "04" "GET" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" "200 404" "" "Retrieve accounting type" ""
test_api_endpoint "business_details" "05" "PUT" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" "200 204" '{"accountingType":"ACCRUAL"}' "Update accounting type" ""
test_api_endpoint "business_details" "06" "GET" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" "200 404" "" "Retrieve periods of account" ""
test_api_endpoint "business_details" "07" "PUT" "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2025-26/periods-of-account" "200 204 400" '{"periodsOfAccount":[{"startDate":"2025-04-06","endDate":"2026-04-05"}]}' "Create/update periods of account" ""
test_api_endpoint "business_details" "08" "GET" "$API_BASE/individuals/business/details/$NINO/list" "200" "" "Test: Multiple businesses" "BUSINESS_AND_PROPERTY"
test_api_endpoint "business_details" "09" "GET" "$API_BASE/individuals/business/details/$NINO/list" "200 404" "" "Test: No businesses" "NOT_FOUND"
test_api_endpoint "business_details" "10" "GET" "$API_BASE/individuals/business/details/$NINO/list" "200" "" "Test: STATEFUL" "STATEFUL"

# Test Obligations API
echo -e "\n${BLUE}Testing Obligations API (3 endpoints)...${NC}"
test_api_endpoint "obligations" "01" "GET" "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" "200" "" "Income & Expenditure obligations" ""
test_api_endpoint "obligations" "02" "GET" "$API_BASE/obligations/details/$NINO/crystallised?from=2023-04-06&to=2024-04-05" "200" "" "Final Declaration obligations" ""
test_api_endpoint "obligations" "03" "GET" "$API_BASE/obligations/details/$NINO/end-of-period-statement?from=2023-04-06&to=2024-04-05" "200" "" "End of Period Statement obligations" ""

# Calculate percentages
BD_PERCENT=$(echo "scale=0; ${API_STATS[business_details_passed]} * 100 / ${API_STATS[business_details_total]}" | bc)
OB_PERCENT=$(echo "scale=0; ${API_STATS[obligations_passed]} * 100 / ${API_STATS[obligations_total]}" | bc)
OVERALL_PERCENT=$(echo "scale=0; $TOTAL_PASSED * 100 / 75" | bc)

# Complete HTML
cat >> "$REPORT_FILE" << HTML_FOOTER
            <div class="api-card" onclick="filterByAPI('business_details')">
                <h4>Business Details API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: ${BD_PERCENT}%"></div>
                </div>
                <div class="api-stats">${API_STATS[business_details_passed]}/${API_STATS[business_details_total]} passed</div>
            </div>
            
            <div class="api-card" onclick="filterByAPI('obligations')">
                <h4>Obligations API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: ${OB_PERCENT}%"></div>
                </div>
                <div class="api-stats">${API_STATS[obligations_passed]}/${API_STATS[obligations_total]} passed</div>
            </div>
            
            <div class="api-card disabled">
                <h4>Self-Employment API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: 0%"></div>
                </div>
                <div class="api-stats">0/9 - Not tested</div>
            </div>
            
            <div class="api-card disabled">
                <h4>Property Business API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: 0%"></div>
                </div>
                <div class="api-stats">0/30 - Not tested</div>
            </div>
            
            <div class="api-card disabled">
                <h4>BSAS API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: 0%"></div>
                </div>
                <div class="api-stats">0/8 - Not tested</div>
            </div>
            
            <div class="api-card disabled">
                <h4>Calculations API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: 0%"></div>
                </div>
                <div class="api-stats">0/4 - Not tested</div>
            </div>
            
            <div class="api-card disabled">
                <h4>Losses API</h4>
                <div class="api-progress">
                    <div class="api-progress-fill" style="width: 0%"></div>
                </div>
                <div class="api-stats">0/11 - Not tested</div>
            </div>
        </div>
        
        <div class="filter-bar">
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="showAll()">Show All</button>
                <button class="filter-btn" onclick="filterByStatus('success')">✓ Passed Only</button>
                <button class="filter-btn" onclick="filterByStatus('danger')">✗ Failed Only</button>
                <button class="filter-btn" onclick="expandAll()">Expand All</button>
                <button class="filter-btn" onclick="collapseAll()">Collapse All</button>
            </div>
        </div>
        
        <div class="tests-table">
            <table>
                <thead>
                    <tr>
                        <th width="5%">#</th>
                        <th width="30%">Test Name</th>
                        <th width="8%">Method</th>
                        <th width="35%">Endpoint</th>
                        <th width="8%">Status</th>
                        <th width="7%">Result</th>
                        <th width="7%">Action</th>
                    </tr>
                </thead>
                <tbody id="test-results">
                    $API_TEST_RESULTS
                </tbody>
            </table>
        </div>
        
        <div class="overall-progress">
            <h3 style="margin-bottom: 15px;">Overall Testing Progress</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${OVERALL_PERCENT}%">
                    ${OVERALL_PERCENT}% Complete (${TOTAL_PASSED}/75 tests passed)
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Update statistics
        document.getElementById('timestamp').textContent = '$(cat /tmp/timestamp.txt)';
        document.getElementById('overall-percentage').textContent = '${OVERALL_PERCENT}';
        document.getElementById('total-tests').textContent = 'Total: ${TOTAL_TESTS}/75';
        document.getElementById('total-passed').textContent = 'Passed: ${TOTAL_PASSED}';
        document.getElementById('total-failed').textContent = 'Failed: ${TOTAL_FAILED}';
        document.getElementById('api-coverage').textContent = '2/7';
        
        // Update status
        if (${TOTAL_FAILED} === 0 && ${TOTAL_TESTS} === 75) {
            document.getElementById('test-status').textContent = 'COMPLETE';
            document.getElementById('test-status').style.color = '#48bb78';
        } else if (${TOTAL_FAILED} > 0) {
            document.getElementById('test-status').textContent = 'FAILURES DETECTED';
            document.getElementById('test-status').style.color = '#f56565';
        }
        
        function toggleDetails(btn) {
            const row = btn.closest('tr');
            const detailsRow = row.nextElementSibling;
            detailsRow.style.display = detailsRow.style.display === 'none' ? 'table-row' : 'none';
            btn.textContent = detailsRow.style.display === 'none' ? 'Details' : 'Hide';
        }
        
        function filterByAPI(api) {
            const rows = document.querySelectorAll('.test-row');
            const cards = document.querySelectorAll('.api-card');
            
            cards.forEach(card => card.classList.remove('active'));
            event.target.closest('.api-card').classList.add('active');
            
            rows.forEach(row => {
                row.style.display = row.dataset.api === api ? 'table-row' : 'none';
                if (row.nextElementSibling.classList.contains('details-row')) {
                    row.nextElementSibling.style.display = 'none';
                }
            });
        }
        
        function filterByStatus(status) {
            const rows = document.querySelectorAll('.test-row');
            rows.forEach(row => {
                row.style.display = row.classList.contains(status) ? 'table-row' : 'none';
                if (row.nextElementSibling.classList.contains('details-row')) {
                    row.nextElementSibling.style.display = 'none';
                }
            });
        }
        
        function showAll() {
            const rows = document.querySelectorAll('.test-row');
            rows.forEach(row => row.style.display = 'table-row');
        }
        
        function expandAll() {
            const detailRows = document.querySelectorAll('.details-row');
            detailRows.forEach(row => row.style.display = 'table-row');
        }
        
        function collapseAll() {
            const detailRows = document.querySelectorAll('.details-row');
            detailRows.forEach(row => row.style.display = 'none');
        }
    </script>
</body>
</html>
HTML_FOOTER

echo ""
echo "================================================"
echo -e "${CYAN}Dashboard Generated Successfully!${NC}"
echo "================================================"
echo "File: $REPORT_FILE"
echo "Total APIs Tested: 2/7"
echo "Total Tests Run: $TOTAL_TESTS/75"
echo "Overall Success Rate: ${OVERALL_PERCENT}%"
echo "================================================"

# Open in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$REPORT_FILE"
fi

rm -f /tmp/timestamp.txt