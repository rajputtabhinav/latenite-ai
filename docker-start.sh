#!/bin/bash
# Latenite AI - Quick Start Script for Docker
# This script helps you get started quickly

set -e

echo "🐳 Latenite AI - Docker Quick Start"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo ""
    echo "Creating .env from template..."
    cp .env.docker.example .env
    echo ""
    echo "📝 Please edit .env and add your API keys:"
    echo "   - ANTHROPIC_API_KEY (required)"
    echo "   - OPENAI_API_KEY (optional)"
    echo ""
    echo "After editing .env, run this script again!"
    exit 0
fi

echo "✅ Environment file found"
echo ""

# Check if API key is set
if ! grep -q "sk-ant-api03-" .env; then
    echo "⚠️  ANTHROPIC_API_KEY not configured in .env!"
    echo ""
    echo "Please edit .env and add your Anthropic API key"
    echo "Get it from: https://console.anthropic.com/settings/keys"
    echo ""
    exit 0
fi

echo "✅ API keys configured"
echo ""

# Ask for deployment mode
echo "Select deployment mode:"
echo "1) Development (with hot reload)"
echo "2) Production (single instance)"
echo "3) Production (scaled - 3 instances)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting in DEVELOPMENT mode..."
        docker-compose -f docker-compose.dev.yml up
        ;;
    2)
        echo ""
        echo "🚀 Starting in PRODUCTION mode (single instance)..."
        docker-compose up -d
        echo ""
        echo "✅ Services started!"
        echo ""
        echo "Access application: http://localhost:5000"
        echo "View logs: docker-compose logs -f"
        echo "Stop services: docker-compose down"
        ;;
    3)
        echo ""
        echo "🚀 Starting in PRODUCTION mode (scaled to 3 instances)..."
        docker-compose -f docker-compose.prod.yml up -d --scale latenite-ai=3
        echo ""
        echo "✅ Services started with 3 replicas!"
        echo ""
        echo "Access application: http://localhost:80"
        echo "View logs: docker-compose logs -f"
        echo "Stop services: docker-compose -f docker-compose.prod.yml down"
        ;;
    *)
        echo "❌ Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "🎊 Latenite AI is running!"
echo ""
