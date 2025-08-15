#!/bin/bash

# Script to download HMRC OpenAPI specifications when needed
# This avoids committing large spec files to the repository

SPECS_DIR="openapi-specs"
mkdir -p "$SPECS_DIR"

echo "📥 Downloading HMRC MTD OpenAPI Specifications..."
echo ""
echo "⚠️  Note: These are large files (>130MB total)"
echo "    Only download if you need them for reference"
echo ""

# Create placeholder file with instructions
cat > "$SPECS_DIR/README.md" << 'EOF'
# OpenAPI Specifications

This directory should contain HMRC OpenAPI specifications.

## How to obtain the specs:

1. Visit [HMRC Developer Hub](https://developer.service.hmrc.gov.uk/api-documentation/docs/api)
2. Navigate to each API documentation page
3. Download the OpenAPI/OAS specification file
4. Place the YAML files in this directory

## Required APIs:

- Individual Calculations API
- Individual Losses API  
- Self Assessment Accounts API
- Property Business API
- Self Employment Business API
- Business Source Adjustable Summary API
- Obligations API
- Test Fraud Prevention Headers API

## Note:

These files are git-ignored to keep the repository size manageable.
The specifications total over 130,000 lines of YAML.
EOF

echo "✅ OpenAPI specs directory prepared"
echo "ℹ️  Please download specs manually from HMRC Developer Hub"
echo "    Visit: https://developer.service.hmrc.gov.uk/api-documentation/docs/api"
echo ""
echo "📝 Instructions saved to $SPECS_DIR/README.md"