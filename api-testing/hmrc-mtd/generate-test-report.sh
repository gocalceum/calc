#!/bin/bash

# Enhanced Test Report Generator with Response Capture
# This script runs all API tests and generates a comprehensive HTML report

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize variables
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
TEST_RESULTS=""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
REPORT_FILE="test-report-$(date '+%Y%m%d-%H%M%S').html"

# Load token
TOKEN=$(cat .tokens.json | jq -r '.access_token' 2>/dev/null || echo "")
API_BASE="https://test-api.service.hmrc.gov.uk"
NINO="NE101272A"
BUSINESS_ID="XBIS12345678901"

# Function to escape HTML
escape_html() {
    echo "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/'"'"'/\&#39;/g'
}

# Function to format JSON
format_json() {
    echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Function to test endpoint and capture all details
test_endpoint() {
    local method=$1
    local url=$2
    local expected=$3
    local body=$4
    local test_name=$5
    local scenario=$6
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local test_id="test-$TOTAL_TESTS"
    
    echo -e "${BLUE}Testing:${NC} $test_name"
    
    # Prepare headers
    local headers="-H \"Authorization: Bearer $TOKEN\" \
-H \"Accept: application/vnd.hmrc.2.0+json\" \
-H \"Gov-Client-Connection-Method: DESKTOP_APP_DIRECT\" \
-H \"Gov-Client-Device-ID: test-device-id\" \
-H \"Gov-Client-User-IDs: test-user\" \
-H \"Gov-Client-Timezone: UTC+00:00\" \
-H \"Gov-Client-Local-IPs: 127.0.0.1\" \
-H \"Gov-Client-User-Agent: bruno-test\" \
-H \"Gov-Vendor-Version: 1.0.0\""
    
    if [ -n "$scenario" ]; then
        headers="$headers -H \"Gov-Test-Scenario: $scenario\""
    fi
    
    if [ "$method" = "PUT" ] || [ "$method" = "POST" ]; then
        headers="$headers -H \"Content-Type: application/json\""
    fi
    
    # Execute request
    local start_time=$(date +%s)
    
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
            ${scenario:+-H "Gov-Test-Scenario: $scenario"})
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
            -H "Gov-Vendor-Version: 1.0.0" \
            ${scenario:+-H "Gov-Test-Scenario: $scenario"})
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    duration="${duration}s"
    
    # Parse response
    STATUS=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    # Format response body
    FORMATTED_BODY=$(format_json "$BODY")
    ESCAPED_BODY=$(escape_html "$FORMATTED_BODY")
    ESCAPED_REQUEST_BODY=$(escape_html "$(format_json "$body")")
    
    # Determine test result
    local status_class="badge-danger"
    local test_result="FAIL"
    
    if [[ " $expected " =~ " $STATUS " ]]; then
        status_class="badge-success"
        test_result="PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "  ${GREEN}✓ PASS${NC} (Status: $STATUS, Time: ${duration})"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "  ${RED}✗ FAIL${NC} (Status: $STATUS, Expected: $expected, Time: ${duration})"
    fi
    
    # Build HTML for this test
    TEST_RESULTS="$TEST_RESULTS
    <div class='test-card' id='$test_id'>
        <div class='test-header' onclick='toggleDetails(\"$test_id\")'>
            <div class='test-info'>
                <span class='test-number'>#$TOTAL_TESTS</span>
                <span class='test-name'>$test_name</span>
                <span class='badge badge-$method'>$method</span>
                <span class='badge $status_class'>$STATUS</span>
                <span class='badge badge-time'>${duration}</span>
            </div>
            <div class='test-status $test_result'>
                $([ "$test_result" = "PASS" ] && echo "✓" || echo "✗")
            </div>
        </div>
        <div class='test-details' style='display: none;'>
            <div class='detail-section'>
                <h4>Request</h4>
                <div class='code-block'>
                    <div class='url'>$method $url</div>
                    $([ -n "$scenario" ] && echo "<div class='scenario'>Scenario: $scenario</div>")
                    $([ -n "$body" ] && echo "<div class='request-body'><strong>Body:</strong><pre>$ESCAPED_REQUEST_BODY</pre></div>")
                </div>
            </div>
            <div class='detail-section'>
                <h4>Response</h4>
                <div class='code-block'>
                    <div class='response-status'>Status: $STATUS $([ "$test_result" = "PASS" ] && echo "(Expected: $expected)" || echo "<span class='error'>(Expected: $expected)</span>")</div>
                    <div class='response-body'>
                        <strong>Body:</strong>
                        <pre>$ESCAPED_BODY</pre>
                    </div>
                </div>
            </div>
        </div>
    </div>"
    
    sleep 1  # Rate limiting
}

# Start HTML report
cat > "$REPORT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HMRC API Test Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 14px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-total { color: #667eea; }
        .stat-passed { color: #48bb78; }
        .stat-failed { color: #f56565; }
        .stat-skipped { color: #ed8936; }
        
        .filters {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .filter-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 8px 16px;
            border: 2px solid #e2e8f0;
            background: white;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .filter-btn:hover {
            background: #f7fafc;
        }
        
        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        .test-card {
            background: white;
            border-radius: 10px;
            margin-bottom: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: all 0.3s;
        }
        
        .test-card.expanded {
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        
        .test-header {
            padding: 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.3s;
        }
        
        .test-header:hover {
            background: #f7fafc;
        }
        
        .test-info {
            display: flex;
            align-items: center;
            gap: 15px;
            flex-wrap: wrap;
        }
        
        .test-number {
            color: #a0aec0;
            font-weight: bold;
        }
        
        .test-name {
            font-weight: 500;
            color: #2d3748;
        }
        
        .badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-GET { background: #bee3f8; color: #2c5282; }
        .badge-POST { background: #c6f6d5; color: #22543d; }
        .badge-PUT { background: #fed7d7; color: #742a2a; }
        .badge-DELETE { background: #feebc8; color: #7c2d12; }
        .badge-success { background: #c6f6d5; color: #22543d; }
        .badge-danger { background: #fed7d7; color: #742a2a; }
        .badge-time { background: #e9d8fd; color: #44337a; }
        
        .test-status {
            font-size: 24px;
            font-weight: bold;
        }
        
        .test-status.PASS { color: #48bb78; }
        .test-status.FAIL { color: #f56565; }
        
        .test-details {
            border-top: 1px solid #e2e8f0;
            padding: 20px;
            background: #f7fafc;
        }
        
        .detail-section {
            margin-bottom: 20px;
        }
        
        .detail-section h4 {
            color: #4a5568;
            margin-bottom: 10px;
        }
        
        .code-block {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 5px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        
        .url {
            color: #2b6cb0;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .scenario {
            color: #805ad5;
            margin-bottom: 10px;
        }
        
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            margin: 0;
            color: #2d3748;
            line-height: 1.5;
        }
        
        .error {
            color: #f56565;
            font-weight: bold;
        }
        
        .search-box {
            width: 100%;
            padding: 10px;
            border: 2px solid #e2e8f0;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 14px;
        }
        
        .live-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #48bb78;
            border-radius: 50%;
            margin-right: 5px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .progress-bar {
            height: 4px;
            background: #e2e8f0;
            border-radius: 2px;
            overflow: hidden;
            margin-top: 10px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78 0%, #38a169 100%);
            transition: width 0.3s;
        }
        
        @media (max-width: 768px) {
            .stats {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .test-info {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h1>🚀 HMRC API Test Report</h1>
                    <div class="subtitle">
                        <span class="live-indicator"></span>
                        Generated on: <span id="timestamp">DATE_PLACEHOLDER</span>
                    </div>
                </div>
                <button onclick="window.location.reload()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Refresh
                </button>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number stat-total" id="total-count">0</div>
                <div class="stat-label">Total Tests</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress" style="width: 0%"></div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-number stat-passed" id="passed-count">0</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number stat-failed" id="failed-count">0</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number stat-skipped" id="skipped-count">0</div>
                <div class="stat-label">Skipped</div>
            </div>
        </div>
        
        <div class="filters">
            <input type="text" class="search-box" id="search" placeholder="🔍 Search tests by name, URL, or response...">
            <div class="filter-buttons">
                <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
                <button class="filter-btn" onclick="filterTests('passed')">✓ Passed</button>
                <button class="filter-btn" onclick="filterTests('failed')">✗ Failed</button>
                <button class="filter-btn" onclick="filterTests('GET')">GET</button>
                <button class="filter-btn" onclick="filterTests('PUT')">PUT</button>
                <button class="filter-btn" onclick="filterTests('POST')">POST</button>
                <button class="filter-btn" onclick="filterTests('DELETE')">DELETE</button>
                <button class="filter-btn" onclick="expandAll()">⬇ Expand All</button>
                <button class="filter-btn" onclick="collapseAll()">⬆ Collapse All</button>
            </div>
        </div>
        
        <div id="test-results">
EOF

echo "
Generating comprehensive test report...
========================================
"

# Run Business Details API tests
echo -e "\n${BLUE}Testing Business Details API...${NC}"
echo "----------------------------------------"

test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/list" \
    "200" \
    "" \
    "List all businesses (DEFAULT)" \
    ""

test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID" \
    "200" \
    "" \
    "Get business details" \
    ""

test_endpoint "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" \
    "200 204" \
    '{"quarterlyPeriodType":"standard"}' \
    "Create/amend quarterly period (2023-24)" \
    ""

test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2023-24" \
    "200 404" \
    "" \
    "Retrieve quarterly period (2023-24)" \
    ""

test_endpoint "PUT" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 204" \
    '{"accountingType":"ACCRUAL"}' \
    "Update accounting type (2024-25)" \
    ""

test_endpoint "GET" \
    "$API_BASE/individuals/business/details/$NINO/$BUSINESS_ID/2024-25/accounting-type" \
    "200 404" \
    "" \
    "Retrieve accounting type (2024-25)" \
    ""

# Run Obligations API tests
echo -e "\n${BLUE}Testing Obligations API...${NC}"
echo "----------------------------------------"

test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/income-and-expenditure?from=2023-04-06&to=2024-04-05" \
    "200" \
    "" \
    "Income & Expenditure obligations (2023-24)" \
    ""

test_endpoint "GET" \
    "$API_BASE/obligations/details/$NINO/crystallised?from=2023-04-06&to=2024-04-05" \
    "200" \
    "" \
    "Final Declaration obligations (2023-24)" \
    ""

# Complete the HTML report
cat >> "$REPORT_FILE" << EOF
        $TEST_RESULTS
        </div>
    </div>
    
    <script>
        // Update statistics
        document.getElementById('timestamp').textContent = '$TIMESTAMP';
        document.getElementById('total-count').textContent = '$TOTAL_TESTS';
        document.getElementById('passed-count').textContent = '$PASSED_TESTS';
        document.getElementById('failed-count').textContent = '$FAILED_TESTS';
        document.getElementById('skipped-count').textContent = '$SKIPPED_TESTS';
        
        // Calculate and set progress
        const progress = ($PASSED_TESTS / $TOTAL_TESTS * 100).toFixed(1);
        document.getElementById('progress').style.width = progress + '%';
        
        // Toggle test details
        function toggleDetails(testId) {
            const card = document.getElementById(testId);
            const details = card.querySelector('.test-details');
            const isVisible = details.style.display === 'block';
            
            details.style.display = isVisible ? 'none' : 'block';
            card.classList.toggle('expanded', !isVisible);
        }
        
        // Filter tests
        function filterTests(filter) {
            const cards = document.querySelectorAll('.test-card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update active button
            buttons.forEach(btn => {
                if (btn.textContent.includes(filter) || 
                    (filter === 'all' && btn.textContent === 'All Tests') ||
                    (filter === 'passed' && btn.textContent.includes('Passed')) ||
                    (filter === 'failed' && btn.textContent.includes('Failed'))) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Filter cards
            cards.forEach(card => {
                const shouldShow = filter === 'all' ||
                    (filter === 'passed' && card.querySelector('.PASS')) ||
                    (filter === 'failed' && card.querySelector('.FAIL')) ||
                    card.innerHTML.includes('badge-' + filter);
                
                card.style.display = shouldShow ? 'block' : 'none';
            });
        }
        
        // Search functionality
        document.getElementById('search').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.test-card');
            
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(searchTerm) ? 'block' : 'none';
            });
        });
        
        // Expand all
        function expandAll() {
            document.querySelectorAll('.test-details').forEach(details => {
                details.style.display = 'block';
                details.closest('.test-card').classList.add('expanded');
            });
        }
        
        // Collapse all
        function collapseAll() {
            document.querySelectorAll('.test-details').forEach(details => {
                details.style.display = 'none';
                details.closest('.test-card').classList.remove('expanded');
            });
        }
        
        // Auto-refresh every 30 seconds (optional)
        // setInterval(() => window.location.reload(), 30000);
    </script>
</body>
</html>
EOF

echo "
========================================
Test Report Generated Successfully!
========================================
File: $REPORT_FILE
Total Tests: $TOTAL_TESTS
Passed: $PASSED_TESTS
Failed: $FAILED_TESTS
Success Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%
========================================
"

# Open the report in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$REPORT_FILE"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "$REPORT_FILE"
fi