#!/usr/bin/env bun

import { $ } from "bun";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Token storage file
const TOKEN_FILE = join(__dirname, ".tokens.json");

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m"
};

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// Load saved tokens
function loadTokens(): TokenData | null {
  if (existsSync(TOKEN_FILE)) {
    try {
      return JSON.parse(readFileSync(TOKEN_FILE, "utf-8"));
    } catch (e) {
      console.log(`${colors.yellow}Could not load saved tokens${colors.reset}`);
    }
  }
  return null;
}

// Save tokens
function saveTokens(tokens: TokenData) {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`${colors.green}✓ Tokens saved to ${TOKEN_FILE}${colors.reset}`);
}

// Check if token is expired
function isTokenExpired(tokens: TokenData): boolean {
  if (!tokens.expires_at) return true;
  // Refresh 5 minutes before expiry
  return Date.now() > (tokens.expires_at - 5 * 60 * 1000);
}

// Run a Bruno request and capture output
async function runBrunoRequest(request: string, env = "sandbox"): Promise<any> {
  const outputFile = `temp-${Date.now()}.json`;
  try {
    const result = await $`./node_modules/.bin/bru run ${request} --env ${env} --output ${outputFile}`.quiet();
    
    if (existsSync(outputFile)) {
      const data = JSON.parse(readFileSync(outputFile, "utf-8"));
      await $`rm ${outputFile}`.quiet();
      return data;
    }
    return null;
  } catch (e) {
    if (existsSync(outputFile)) {
      await $`rm ${outputFile}`.quiet();
    }
    throw e;
  }
}

// Main test runner
async function main() {
  console.log(`${colors.blue}🚀 HMRC MTD API Test Suite${colors.reset}\n`);

  let tokens = loadTokens();
  
  // Step 1: Check if we need new tokens
  if (!tokens || !tokens.access_token) {
    console.log(`${colors.yellow}No valid tokens found. Please run OAuth2 flow first:${colors.reset}`);
    console.log(`
1. Open: https://test-www.tax.service.gov.uk/oauth/authorize?response_type=code&client_id=iQetMYZLL2Gq9dmqFTcJGSVMLpxZ&scope=hello%20read:self-assessment%20write:self-assessment&redirect_uri=https://oauth.pstmn.io/v1/callback&state=test123
2. Login with test credentials (User: 959074877093, Pass: WV2iaEfIAo9J)
3. Copy the authorization code
4. Run: bun run-all-tests.ts --code YOUR_CODE_HERE
`);
    
    // Check if code was provided as argument
    const codeArg = process.argv.find(arg => arg.startsWith("--code="));
    if (codeArg) {
      const code = codeArg.split("=")[1];
      console.log(`${colors.green}Using authorization code: ${code}${colors.reset}`);
      
      // Update the OAuth2 complete test with the new code
      const oauth2File = join(__dirname, "auth/oauth2-complete-test.bru");
      let content = readFileSync(oauth2File, "utf-8");
      content = content.replace(/code: [a-f0-9]+/, `code: ${code}`);
      writeFileSync(oauth2File, content);
      
      // Exchange code for tokens
      console.log(`${colors.blue}Exchanging authorization code for tokens...${colors.reset}`);
      const tokenResult = await runBrunoRequest("auth/oauth2-complete-test.bru");
      
      if (tokenResult && tokenResult[0]?.results[0]?.response?.status === 200) {
        const responseData = tokenResult[0].results[0].response.data;
        tokens = {
          access_token: responseData.access_token,
          refresh_token: responseData.refresh_token,
          expires_at: Date.now() + (responseData.expires_in * 1000)
        };
        saveTokens(tokens);
        console.log(`${colors.green}✓ Tokens obtained successfully!${colors.reset}\n`);
      } else {
        console.error(`${colors.red}Failed to exchange code for tokens${colors.reset}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }

  // Step 2: Check if token needs refresh
  if (tokens && isTokenExpired(tokens)) {
    console.log(`${colors.yellow}Token expired or expiring soon. Refreshing...${colors.reset}`);
    
    if (!tokens.refresh_token) {
      console.error(`${colors.red}No refresh token available. Please re-authenticate.${colors.reset}`);
      process.exit(1);
    }
    
    // Update refresh token in the request
    const refreshFile = join(__dirname, "auth/refresh-token.bru");
    let content = readFileSync(refreshFile, "utf-8");
    content = content.replace(/refresh_token: .*/, `refresh_token: ${tokens.refresh_token}`);
    writeFileSync(refreshFile, content);
    
    const refreshResult = await runBrunoRequest("auth/refresh-token.bru");
    
    if (refreshResult && refreshResult[0]?.results[0]?.response?.status === 200) {
      const responseData = refreshResult[0].results[0].response.data;
      tokens = {
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token || tokens.refresh_token,
        expires_at: Date.now() + (responseData.expires_in * 1000)
      };
      saveTokens(tokens);
      console.log(`${colors.green}✓ Token refreshed successfully!${colors.reset}\n`);
    } else {
      console.error(`${colors.red}Failed to refresh token${colors.reset}`);
      process.exit(1);
    }
  }

  // Step 3: Update all test files with current access token
  console.log(`${colors.blue}Updating test files with current access token...${colors.reset}`);
  
  const testFiles = [
    "test/hello-world.bru",
    "test/hello-user.bru",
    "test/self-assessment-test.bru",
    "test/sa-balance.bru",
    "test/sa-accounts.bru",
    "test/individual-details.bru"
  ];
  
  for (const file of testFiles) {
    const filePath = join(__dirname, file);
    if (existsSync(filePath)) {
      let content = readFileSync(filePath, "utf-8");
      // Update Bearer token in headers
      content = content.replace(/Authorization: Bearer [a-f0-9]+/g, `Authorization: Bearer ${tokens!.access_token}`);
      // Also handle variable references
      content = content.replace(/Authorization: Bearer {{access_token}}/g, `Authorization: Bearer ${tokens!.access_token}`);
      writeFileSync(filePath, content);
    }
  }
  
  console.log(`${colors.green}✓ Test files updated${colors.reset}\n`);

  // Step 4: Run all tests
  console.log(`${colors.blue}Running API Tests...${colors.reset}\n`);
  
  const tests = [
    { name: "Hello World", file: "test/hello-world.bru" },
    { name: "Hello User", file: "test/hello-user.bru" },
    { name: "Individual Details", file: "test/individual-details.bru" },
    { name: "Self Assessment Balance", file: "test/sa-balance.bru" },
    { name: "Self Assessment Accounts", file: "test/sa-accounts.bru" },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const result = await runBrunoRequest(test.file);
      
      if (result && result[0]?.results[0]?.response?.status === 200) {
        console.log(`${colors.green}✓ PASSED${colors.reset}`);
        
        // Show response data for debugging
        const responseData = result[0].results[0].response.data;
        if (responseData) {
          console.log(`  Response: ${JSON.stringify(responseData, null, 2).split('\n').join('\n  ')}`);
        }
        passed++;
      } else {
        const status = result?.[0]?.results[0]?.response?.status || "Unknown";
        const error = result?.[0]?.results[0]?.response?.data || {};
        console.log(`${colors.red}✗ FAILED (Status: ${status})${colors.reset}`);
        console.log(`  Error: ${JSON.stringify(error, null, 2).split('\n').join('\n  ')}`);
        failed++;
      }
    } catch (e) {
      console.log(`${colors.red}✗ ERROR${colors.reset}`);
      console.log(`  ${e}`);
      failed++;
    }
    
    console.log("");
  }
  
  // Summary
  console.log(`${colors.blue}${"=".repeat(50)}${colors.reset}`);
  console.log(`${colors.blue}Test Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`  Total: ${passed + failed}`);
  
  if (tokens) {
    const expiresIn = tokens.expires_at ? Math.floor((tokens.expires_at - Date.now()) / 1000 / 60) : 0;
    console.log(`\n${colors.yellow}Token expires in ${expiresIn} minutes${colors.reset}`);
  }
}

// Run the test suite
main().catch(console.error);