#!/bin/bash

echo "🚀 Starting Supabase Local Development"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop and run this script again."
    echo "Download Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start Supabase
echo "Starting Supabase services..."
supabase start

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Supabase is running locally!"
    echo ""
    echo "📌 Local URLs:"
    echo "   Studio URL: http://localhost:54323"
    echo "   API URL: http://localhost:54321"
    echo "   DB URL: postgresql://postgres:postgres@localhost:54322/postgres"
    echo ""
    echo "🔑 Local Keys (already in .env.local):"
    echo "   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    echo "   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    echo ""
    echo "To use local environment, run:"
    echo "   export $(cat .env.local | xargs)"
    echo "   bun dev"
else
    echo "❌ Failed to start Supabase"
    exit 1
fi