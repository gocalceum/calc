#!/bin/bash

echo "🐳 Docker Desktop Setup"
echo "======================"
echo ""

# Check if Docker is installed
if [ ! -d "/Applications/Docker.app" ]; then
    echo "❌ Docker Desktop not found in /Applications"
    echo ""
    echo "Installing Docker Desktop..."
    brew install --cask docker
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Docker Desktop"
        exit 1
    fi
fi

echo "✅ Docker Desktop is installed"
echo ""

# Launch Docker Desktop
echo "Launching Docker Desktop..."
open -a Docker

echo ""
echo "⏳ Waiting for Docker to start (this may take a minute)..."

# Wait for Docker to be ready
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker is running!"
        echo ""
        docker --version
        echo ""
        echo "You can now run: bun run supabase:start"
        exit 0
    fi
    
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

echo ""
echo "⚠️  Docker is taking longer than expected to start."
echo "Please check if Docker Desktop is running in your menu bar."
echo ""
echo "Once Docker is running, you can proceed with:"
echo "  bun run supabase:start"