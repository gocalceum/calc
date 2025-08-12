#!/usr/bin/env node

/**
 * Smoke tests for production deployment
 * Verifies critical endpoints and functionality are working
 */

const https = require('https');

const PRODUCTION_URL = 'https://app.calceum.com';
const TIMEOUT = 30000; // 30 seconds

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Make HTTP request with timeout
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    }, TIMEOUT);

    https.get(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Run a single test
 */
async function runTest(name, testFn) {
  process.stdout.write(`  Testing ${name}... `);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`${colors.green}✓${colors.reset} (${duration}ms)`);
    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}✗${colors.reset} (${duration}ms)`);
    console.log(`    ${colors.red}Error: ${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, error: error.message });
  }
}

/**
 * Test definitions
 */
const tests = {
  // Test 1: Homepage loads successfully
  async homepageLoads() {
    const response = await httpRequest(PRODUCTION_URL);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    if (!response.body.includes('<!DOCTYPE html>')) {
      throw new Error('Response does not contain valid HTML');
    }
  },

  // Test 2: Static assets are accessible
  async staticAssetsLoad() {
    const response = await httpRequest(PRODUCTION_URL);
    
    // Check for Vite-generated assets
    if (!response.body.includes('.js') && !response.body.includes('.css')) {
      throw new Error('No JavaScript or CSS assets found in HTML');
    }
    
    // Extract and test loading of main JS file
    const jsMatch = response.body.match(/src="(\/assets\/[^"]+\.js)"/);
    if (jsMatch) {
      const jsUrl = `${PRODUCTION_URL}${jsMatch[1]}`;
      const jsResponse = await httpRequest(jsUrl);
      if (jsResponse.statusCode !== 200) {
        throw new Error(`JS asset returned status ${jsResponse.statusCode}`);
      }
    }
  },

  // Test 3: React app initializes
  async reactAppInitializes() {
    const response = await httpRequest(PRODUCTION_URL);
    
    // Check for React root element
    if (!response.body.includes('id="root"')) {
      throw new Error('React root element not found');
    }
    
    // Check for React/Vite indicators
    if (!response.body.includes('modulepreload') && !response.body.includes('type="module"')) {
      throw new Error('Vite module scripts not found');
    }
  },

  // Test 4: Login page is accessible
  async loginPageAccessible() {
    const response = await httpRequest(`${PRODUCTION_URL}/login`);
    if (response.statusCode !== 200) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
  },

  // Test 5: Supabase configuration is present
  async supabaseConfigPresent() {
    const response = await httpRequest(PRODUCTION_URL);
    
    // Check if environment variables were properly injected during build
    // The app should have Supabase URL in the bundle
    if (!response.body.includes('supabase.co') && !response.body.includes('VITE_SUPABASE')) {
      console.log(`    ${colors.yellow}Warning: Supabase configuration may not be properly set${colors.reset}`);
    }
  },

  // Test 6: No console errors in homepage
  async noJavaScriptErrors() {
    const response = await httpRequest(PRODUCTION_URL);
    
    // Check for common error indicators
    const errorIndicators = [
      'Error:',
      'Cannot read',
      'undefined is not',
      'Uncaught',
      'Failed to fetch'
    ];
    
    for (const indicator of errorIndicators) {
      if (response.body.includes(indicator)) {
        console.log(`    ${colors.yellow}Warning: Potential error indicator found: "${indicator}"${colors.reset}`);
      }
    }
  },

  // Test 7: Security headers are present
  async securityHeadersPresent() {
    const response = await httpRequest(PRODUCTION_URL);
    const headers = response.headers;
    
    const recommendedHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'strict-transport-security'
    ];
    
    const missingHeaders = recommendedHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      console.log(`    ${colors.yellow}Warning: Missing security headers: ${missingHeaders.join(', ')}${colors.reset}`);
    }
  },

  // Test 8: Response time is acceptable
  async responseTimeAcceptable() {
    const startTime = Date.now();
    await httpRequest(PRODUCTION_URL);
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 3000) {
      throw new Error(`Response time ${responseTime}ms exceeds 3000ms threshold`);
    }
    
    if (responseTime > 1500) {
      console.log(`    ${colors.yellow}Warning: Response time ${responseTime}ms is higher than optimal${colors.reset}`);
    }
  }
};

/**
 * Main test runner
 */
async function runSmokeTests() {
  console.log(`\n${colors.blue}🔥 Running Smoke Tests${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`Target: ${PRODUCTION_URL}\n`);

  // Run all tests
  for (const [testName, testFn] of Object.entries(tests)) {
    await runTest(testName, testFn);
  }

  // Print summary
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`  Total:  ${results.passed + results.failed}`);

  // Calculate total duration
  const totalDuration = results.tests.reduce((sum, test) => sum + test.duration, 0);
  console.log(`  Time:   ${totalDuration}ms\n`);

  // Exit with appropriate code
  if (results.failed > 0) {
    console.log(`${colors.red}❌ Smoke tests failed!${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ All smoke tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run tests
runSmokeTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});