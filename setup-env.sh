#!/bin/bash

# ChessMate Environment Setup Script
# This script helps you create your .env file from .env.example

set -e

echo "=========================================="
echo "ChessMate Environment Setup"
echo "=========================================="
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Keeping existing .env file."
        exit 0
    fi
fi

# Check if .env.example exists
if [ ! -f ".env.example" ]; then
    echo "❌ Error: .env.example not found!"
    exit 1
fi

# Copy .env.example to .env
cp .env.example .env
echo "✅ Created .env file from .env.example"
echo ""

echo "=========================================="
echo "⚠️  IMPORTANT: Configure Your Environment"
echo "=========================================="
echo ""
echo "Your .env file has been created with placeholder values."
echo "You MUST update it with your actual credentials:"
echo ""
echo "1. Create a Supabase project at: https://supabase.com"
echo "2. Get your credentials from: Settings → API"
echo "3. Edit .env and replace these values:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "   - VITE_GEMINI_API_KEY"
echo ""
echo "For detailed setup instructions, see:"
echo "- README.md (Setup Requirements section)"
echo "- .env file (includes checklist)"
echo ""
echo "=========================================="
echo "Run 'npm run dev' after configuration"
echo "=========================================="
