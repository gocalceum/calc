#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";
import { $ } from "bun";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m"
};

// Complete list of Income Tax MTD APIs
const MTD_APIS = [
  // Core Business APIs
  { name: "Business Details", service: "business-details-api", version: "2.0", category: "business", done: true },
  { name: "Business Income Source Summary", service: "self-assessment-biss-api", version: "3.0", category: "business" },
  { name: "Business Source Adjustable Summary", service: "self-assessment-bsas-api", version: "7.0", category: "business" },
  { name: "Property Business", service: "property-business-api", version: "6.0", category: "business" },
  { name: "Self Employment Business", service: "self-employment-business-api", version: "5.0", category: "business" },

  // Individual Income APIs
  { name: "Individuals Capital Gains Income", service: "individuals-capital-gains-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Dividends Income", service: "individuals-dividends-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Employments Income", service: "individuals-employments-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Foreign Income", service: "individuals-foreign-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Insurance Policies Income", service: "individuals-insurance-policies-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Other Income", service: "individuals-other-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Pensions Income", service: "individuals-pensions-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Savings Income", service: "individuals-savings-income-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals State Benefits", service: "individuals-state-benefits-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Expenses", service: "individuals-expenses-api", version: "3.0", category: "individuals-income" },
  { name: "Individuals Charges", service: "individuals-charges-api", version: "3.0", category: "individuals-income" },
  { name: "Individuals Disclosures", service: "individuals-disclosures-api", version: "2.0", category: "individuals-income" },
  { name: "Individuals Reliefs", service: "individuals-reliefs-api", version: "2.0", category: "individuals-income" },

  // Calculation & Assessment APIs
  { name: "Individual Calculations", service: "individual-calculations-api", version: "8.0", category: "calculations" },
  { name: "Individual Losses", service: "individual-losses-api", version: "6.0", category: "calculations" },
  { name: "Obligations", service: "obligations-api", version: "3.0", category: "calculations" },
  { name: "Self Assessment Accounts", service: "self-assessment-accounts-api", version: "4.0", category: "self-assessment" },
  { name: "Self Assessment Assist", service: "self-assessment-assist", version: "1.0", category: "self-assessment" },
  { name: "Self Assessment Individual Details", service: "self-assessment-individual-details-api", version: "2.0", category: "self-assessment" },
  { name: "Self Assessment Test Support", service: "mtd-sa-test-support-api", version: "1.0", category: "self-assessment" },

  // Support APIs
  { name: "Test Fraud Prevention Headers", service: "txm-fph-validator-api", version: "1.0", category: "support" }
];

interface OpenAPISpec {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
  paths: {
    [path: string]: {
      [method: string]: any;
    };
  };
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50);
}

async function downloadOpenAPISpec(api: typeof MTD_APIS[0]): Promise<string | null> {
  // Use /oas/resolved to get the actual YAML file
  const url = `https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/${api.service}/${api.version}/oas/resolved`;
  
  console.log(`  📥 Downloading ${api.name}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    ${colors.red}✗ Failed: ${response.status}${colors.reset}`);
      return null;
    }
    
    const content = await response.text();
    console.log(`    ${colors.green}✓ Downloaded (${content.length} bytes)${colors.reset}`);
    return content;
  } catch (error) {
    console.log(`    ${colors.red}✗ Error: ${error}${colors.reset}`);
    return null;
  }
}

function generateBruFile(
  path: string,
  method: string,
  operation: any,
  spec: OpenAPISpec,
  index: number,
  apiName: string
): string {
  const headers: string[] = [];
  const queryParams: string[] = [];
  const pathParams: { [key: string]: string } = {};
  
  // Extract parameters
  if (operation.parameters) {
    for (const param of operation.parameters) {
      if (param.in === "header") {
        if (param.name === "Authorization") {
          headers.push(`  ${param.name}: Bearer {{access_token}}`);
        } else if (param.name === "Accept") {
          headers.push(`  ${param.name}: ${param.example || param.schema?.enum?.[0] || "application/json"}`);
        } else if (param.name !== "Gov-Test-Scenario") {
          headers.push(`  ${param.name}: ${param.example || `{{${param.name}}}`}`);
        }
      } else if (param.in === "query") {
        queryParams.push(`  ${param.name}: ${param.example || ""}`);
      } else if (param.in === "path") {
        pathParams[param.name] = param.example || `{{${param.name}}}`;
      }
    }
  }
  
  // Build URL with path parameters
  let url = path;
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(`{${key}}`, value);
  }
  
  const baseUrl = "{{base_url}}";
  url = baseUrl + url;
  
  let bruContent = `meta {
  name: ${operation.summary || path}
  type: http
  seq: ${index}
}

${method} {
  url: ${url}${(method === "post" || method === "put" || method === "patch") ? "\n  body: json" : ""}
  auth: none
}
`;

  if (queryParams.length > 0) {
    bruContent += `
query {
${queryParams.join("\n")}
}
`;
  }

  if (headers.length > 0) {
    bruContent += `
headers {
${headers.join("\n")}
}
`;
  }

  // Add Gov-Test-Scenario handling in pre-request script
  if (operation.parameters?.some((p: any) => p.name === "Gov-Test-Scenario")) {
    bruContent += `
script:pre-request {
  // Add Gov-Test-Scenario header if set
  const scenario = bru.getVar('Gov-Test-Scenario');
  if (scenario && scenario.trim() !== '') {
    req.setHeader('Gov-Test-Scenario', scenario);
  }
}
`;
  }

  // Add request body if present
  if (operation.requestBody?.content) {
    const contentType = Object.keys(operation.requestBody.content)[0];
    const example = operation.requestBody.content[contentType]?.example;
    
    if (example) {
      bruContent += `
body:json {
  ${JSON.stringify(example, null, 2)}
}
`;
    }
  }

  // Add tests
  bruContent += `
tests {
  test("Should return success", function() {
    expect(res.status).to.be.oneOf([200, 201, 204]);
  });
}
`;

  // Add documentation
  if (operation.description || operation.summary) {
    bruContent += `
docs {
  ## ${operation.summary || "API Endpoint"}
  
  ${operation.description || ""}
  
  API: ${apiName}
}
`;
  }

  return bruContent;
}

async function convertAPIToBruno(
  api: typeof MTD_APIS[0], 
  specContent: string, 
  outputDir: string
): Promise<boolean> {
  try {
    const spec = yaml.load(specContent) as OpenAPISpec;
    const collectionName = sanitizeName(api.name);
    const collectionDir = join(outputDir, "collections", api.category, collectionName);
    
    // Create directory
    mkdirSync(collectionDir, { recursive: true });
    
    // Create bruno.json
    const brunoJson = {
      version: "1",
      name: api.name + " (MTD)",
      type: "collection"
    };
    
    writeFileSync(
      join(collectionDir, "bruno.json"),
      JSON.stringify(brunoJson, null, 2)
    );
    
    // Create requests
    let requestIndex = 1;
    let createdCount = 0;
    
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (["get", "post", "put", "delete", "patch"].includes(method)) {
          const fileName = `${requestIndex.toString().padStart(2, "0")}-${sanitizeName(
            operation.summary || `${method}-${path}`
          )}.bru`;
          
          const bruContent = generateBruFile(
            path,
            method,
            operation,
            spec,
            requestIndex,
            api.name
          );
          
          writeFileSync(join(collectionDir, fileName), bruContent);
          requestIndex++;
          createdCount++;
        }
      }
    }
    
    console.log(`    ${colors.green}✓ Created ${createdCount} endpoints${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`    ${colors.red}✗ Conversion failed: ${error}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     HMRC Income Tax MTD API Bulk Import Tool         ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`);

  const outputDir = join(process.cwd());
  const specsDir = join(outputDir, "openapi-specs");
  
  // Create directories
  mkdirSync(specsDir, { recursive: true });
  mkdirSync(join(outputDir, "collections"), { recursive: true });
  
  // Load access token from .tokens.json if available
  let accessToken = "YOUR_ACCESS_TOKEN";
  const tokensFile = join(outputDir, ".tokens.json");
  if (existsSync(tokensFile)) {
    try {
      const tokens = JSON.parse(readFileSync(tokensFile, "utf-8"));
      accessToken = tokens.access_token || accessToken;
      console.log(`${colors.green}✓ Loaded access token from .tokens.json${colors.reset}\n`);
    } catch (e) {
      console.log(`${colors.yellow}⚠ Could not load tokens${colors.reset}\n`);
    }
  }
  
  // Statistics
  let downloaded = 0;
  let converted = 0;
  let skipped = 0;
  const failed: string[] = [];
  
  console.log(`${colors.blue}Processing ${MTD_APIS.length} APIs...${colors.reset}\n`);
  
  for (const api of MTD_APIS) {
    if (api.done) {
      console.log(`${colors.yellow}⏭ Skipping ${api.name} (already done)${colors.reset}`);
      skipped++;
      continue;
    }
    
    console.log(`${colors.blue}📦 ${api.name}${colors.reset}`);
    
    // Download spec
    const specContent = await downloadOpenAPISpec(api);
    if (!specContent) {
      failed.push(api.name);
      continue;
    }
    downloaded++;
    
    // Save spec
    const specFile = join(specsDir, `${sanitizeName(api.name)}.yaml`);
    writeFileSync(specFile, specContent);
    
    // Convert to Bruno
    const success = await convertAPIToBruno(api, specContent, outputDir);
    if (success) {
      converted++;
    } else {
      failed.push(api.name);
    }
    
    console.log("");
  }
  
  // Create shared environment file
  const envDir = join(outputDir, "environments");
  mkdirSync(envDir, { recursive: true });
  
  const envContent = `vars {
  base_url: https://test-api.service.hmrc.gov.uk
  nino: NE101272A
  businessId: XBIS12345678901
  taxYear: 2023-24
  access_token: ${accessToken}
  Gov-Test-Scenario: 
}

vars:secret [
  access_token
]`;
  
  writeFileSync(join(envDir, "sandbox.bru"), envContent);
  
  // Summary
  console.log(`${colors.cyan}${"═".repeat(56)}${colors.reset}`);
  console.log(`${colors.cyan}Summary:${colors.reset}`);
  console.log(`  ${colors.green}✓ Downloaded: ${downloaded}${colors.reset}`);
  console.log(`  ${colors.green}✓ Converted: ${converted}${colors.reset}`);
  console.log(`  ${colors.yellow}⏭ Skipped: ${skipped}${colors.reset}`);
  if (failed.length > 0) {
    console.log(`  ${colors.red}✗ Failed: ${failed.length}${colors.reset}`);
    console.log(`    ${failed.join(", ")}`);
  }
  
  console.log(`\n${colors.green}✨ Import complete!${colors.reset}`);
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log(`  1. Update access token in environments/sandbox.bru`);
  console.log(`  2. Test an API: bru run collections/business/*/01-*.bru --env sandbox`);
  console.log(`  3. Run all tests: bun run-all-tests.ts`);
}

main().catch(console.error);