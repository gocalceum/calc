#!/usr/bin/env bun

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

// Install js-yaml if needed
import { $ } from "bun";
await $`bun add js-yaml @types/js-yaml`.quiet();

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
      [method: string]: {
        summary?: string;
        description?: string;
        parameters?: Array<{
          name: string;
          in: string;
          description?: string;
          required?: boolean;
          schema?: any;
          example?: any;
        }>;
        requestBody?: {
          content?: {
            [contentType: string]: {
              schema?: any;
              example?: any;
            };
          };
        };
        responses?: any;
      };
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

function generateBruFile(
  path: string,
  method: string,
  operation: any,
  spec: OpenAPISpec,
  index: number
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
        } else {
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
  
  // Use test environment URL
  const baseUrl = "{{base_url}}";
  url = baseUrl + url;
  
  let bruContent = `meta {
  name: ${operation.summary || path}
  type: http
  seq: ${index}
}

${method} {
  url: ${url}${method === "post" || method === "put" ? "\n  body: json" : ""}
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
  
  test("Should have correlation ID", function() {
    expect(res.headers["x-correlationid"]).to.be.a("string");
  });
}
`;

  // Add documentation
  if (operation.description || operation.summary) {
    bruContent += `
docs {
  ## ${operation.summary || "API Endpoint"}
  
  ${operation.description || ""}
  
  ### Path Parameters
${Object.entries(pathParams).map(([k, v]) => `  - ${k}: ${v}`).join("\n")}
}
`;
  }

  return bruContent;
}

async function convertOpenAPIToBruno(openAPIPath: string, outputDir: string) {
  console.log("📖 Reading OpenAPI specification...");
  const openAPIContent = readFileSync(openAPIPath, "utf-8");
  const spec = yaml.load(openAPIContent) as OpenAPISpec;
  
  console.log(`✨ Converting "${spec.info.title}" v${spec.info.version}`);
  
  // Create output directory
  const collectionDir = join(outputDir, "business-details-mtd");
  if (!existsSync(collectionDir)) {
    mkdirSync(collectionDir, { recursive: true });
  }
  
  // Create collection metadata
  const brunoJson = {
    version: "1",
    name: spec.info.title,
    type: "collection",
    scripts: {
      moduleWhitelist: ["crypto"],
      filesystemAccess: {
        allow: true
      }
    }
  };
  
  writeFileSync(
    join(collectionDir, "bruno.json"),
    JSON.stringify(brunoJson, null, 2)
  );
  
  // Create requests for each endpoint
  let requestIndex = 1;
  
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
          requestIndex
        );
        
        writeFileSync(join(collectionDir, fileName), bruContent);
        console.log(`  ✅ Created ${fileName}`);
        
        requestIndex++;
      }
    }
  }
  
  // Create environment file
  const envContent = `vars {
  base_url: https://test-api.service.hmrc.gov.uk
  nino: NE101272A
  businessId: XAIS12345678910
  taxYear: 2023-24
  access_token: ${readFileSync(join(outputDir, ".tokens.json"), "utf-8").match(/"access_token":\s*"([^"]+)"/)?.[1] || "YOUR_ACCESS_TOKEN"}
}

vars:secret [
  access_token
]`;
  
  writeFileSync(join(collectionDir, "environment.bru"), envContent);
  
  console.log(`\n🎉 Successfully converted ${requestIndex - 1} endpoints!`);
  console.log(`📁 Collection saved to: ${collectionDir}`);
  console.log(`\n📋 Next steps:`);
  console.log(`  1. cd ${collectionDir}`);
  console.log(`  2. Update environment variables if needed`);
  console.log(`  3. Run tests: bru run --env environment`);
}

// Run the converter
const openAPIPath = "/Users/bhalcrow/Downloads/application (9).yaml";
const outputDir = "/Users/bhalcrow/Projects/calc/api-testing/hmrc-mtd";

convertOpenAPIToBruno(openAPIPath, outputDir).catch(console.error);