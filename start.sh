#!/bin/bash

echo "🚀 Midjourney Generator Web App - Quick Start"
echo "=============================================="
echo ""

# Check if we're in the web-app directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the web-app directory"
    echo "   cd web-app && ./start.sh"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   Please edit .env and add your API keys and database URL"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if PostgreSQL is accessible
echo "🔍 Checking database connection..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL client found"
else
    echo "⚠️  Warning: psql not found. Make sure PostgreSQL is installed and accessible"
fi

echo ""
echo "🎬 Starting development server..."
echo "   App will be available at: http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
