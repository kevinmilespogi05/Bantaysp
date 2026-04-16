#!/bin/bash
# Run local registration server

echo "🚀 Starting local registration server..."
echo "⏳ Make sure SUPABASE_SERVICE_ROLE_KEY and BREVO_API_KEY are in your .env"
echo ""

# Load .env if it exists
if [ -f .env.local ]; then
  echo "📄 Loading .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Run with ts-node
npx ts-node local-server.ts
