#!/bin/bash
set -e
echo "🚀 Setup frontend (Vite/React TS)…"

cd /workspaces/Masterprompt-geschiedenis
[ -d frontend ] || npm create vite@latest frontend -- --template react-ts

cd frontend
npm install
printf "VITE_API_BASE=http://localhost:8080\nVITE_USE_MOCK=1\n" > .env

echo "✅ Klaar. Start nu:"
echo "cd /workspaces/Masterprompt-geschiedenis/frontend && npm run dev"