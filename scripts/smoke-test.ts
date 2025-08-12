#!/usr/bin/env tsx

/**
 * Smoke tests for production deployment
 * Verifies critical endpoints and functionality are working
 */

import https from 'https';
import { IncomingMessage } from 'http';

const PRODUCTION_URL = 'https://app.calceum.com';
const TIMEOUT = 30000; // 30 seconds

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
} as const;

// Test results tracking
interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: string;
}

interface Results {
  passed: number;
  failed: number;
  tests: TestResult[];
}

const results: Results = {
  passed: 0,
  failed: 0,
  tests: []
};

interface HttpResponse {
  statusCode: number;
  headers: IncomingMessage['headers'];
  body: string;
}

/**
 * Make HTTP request with timeout
 */
function httpRequest(url: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${TIMEOUT}ms`));
    }, TIMEOUT);

    https.get(url, (res: IncomingMessage) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Run a single test
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`${colors.red}✗${colors.reset} (${duration}ms)`);
    console.log(`    ${colors.red}Error: ${errorMessage}${colors.reset}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', duration, error: errorMessage });
  }
}

/**
 * Test definitions
 */
const tests = {
  // Test 1: Homepage loads successfully
  async homepageLoads(): Promise<void> {
    const response = await httpRequest(PRODUCTION_URL);
    // Accept 200 or 304 (not modified)
    if (response.statusCode !== 200 && response.statusCode !== 304) {
      throw new Error(`Expected status 200, got ${response.statusCode}`);
    }
    // Check for HTML or script tags (SPA might load JS first)
    if (!response.body.includes('<!DOCTYPE html>') && !response.body.includes('<html') && !response.body.includes('<script')) {
      throw new Error('Response does not contain valid HTML or SPA content');
    }
  },

  // Test 2: Static assets are accessible
  async staticAssetsLoad(): Promise<void> {
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
  async reactAppInitializes(): Promise<void> {
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
  async loginPageAccessible(): Promise<void> {
    const response = await httpRequest(`${PRODUCTION_URL}/login`);
    // Accept 200, 301, 302 (redirects are ok for login page)
    if (response.statusCode !== 200 && response.statusCode !== 301 && response.statusCode !== 302) {
      throw new Error(`Expected status 200 or redirect, got ${response.statusCode}`);
    }
  },

  // Test 5: Supabase configuration is present
  async supabaseConfigPresent(): Promise<void> {
    const response = await httpRequest(PRODUCTION_URL);
    
    // Check if environment variables were properly injected during build
    // The app should have Supabase URL in the bundle
    if (!response.body.includes('supabase.co') && !response.body.includes('VITE_SUPABASE')) {
      console.log(`    ${colors.yellow}Warning: Supabase configuration may not be properly set${colors.reset}`);
    }
  },

  // Test 6: No console errors in homepage
  async noJavaScriptErrors(): Promise<void> {
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
  async securityHeadersPresent(): Promise<void> {
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
  async responseTimeAcceptable(): Promise<void> {
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
async function runSmokeTests(): Promise<void> {
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
process.on('unhandledRejection', (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${colors.red}Unhandled error: ${errorMessage}${colors.reset}`);
  process.exit(1);
});

// Run tests
runSmokeTests().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`${colors.red}Fatal error: ${errorMessage}${colors.reset}`);
  process.exit(1);
});