#!/bin/bash
# Collade AI — run this script to start the app
cd "$(dirname "$0")"
echo "📁 Running from: $(pwd)"
if [ ! -f package.json ]; then
  echo "❌ ERROR: package.json not found!"
  echo "   You are in the wrong folder."
  echo "   The correct folder is:"
  echo "   /Users/samemmanuelvenugopal/Downloads/colladeai (5)"
  exit 1
fi
if ! grep -q '"name": "collade-ai"' package.json 2>/dev/null; then
  echo "⚠️  WARNING: This folder may be an OLD Base44 version."
  echo "   Use: /Users/samemmanuelvenugopal/Downloads/colladeai (5)"
fi
if [ ! -d node_modules ]; then
  echo "📦 Installing dependencies..."
  npm install --registry=https://registry.npmjs.org/
fi
echo "🚀 Starting Collade AI at http://localhost:5173"
npm run dev
