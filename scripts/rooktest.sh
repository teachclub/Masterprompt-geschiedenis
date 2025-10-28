#!/bin/bash

# Rooktest voor de masterprompt backend
# Test de belangrijkste endpoints met dummy data

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
TIMEOUT=10

echo "🧪 Rooktest voor masterprompt backend"
echo "📍 Base URL: $BASE_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -m $TIMEOUT -w "%{http_code}" -o /tmp/health_body.json "$BASE_URL/health")
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Health check failed - HTTP $HTTP_CODE"
    exit 1
fi

if ! grep -q '"status":"ok"' /tmp/health_body.json; then
    echo "❌ Health check failed - missing status:ok"
    cat /tmp/health_body.json
    exit 1
fi

echo "✅ Health check passed"
echo ""

# Test 2: Suggest endpoint
echo "2️⃣  Testing /api/suggest endpoint..."
SUGGEST_PAYLOAD='{"tv":6,"ka":26,"context":"Absolutisme in Frankrijk"}'

SUGGEST_RESPONSE=$(curl -s -m $TIMEOUT -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$SUGGEST_PAYLOAD" \
    -o /tmp/suggest_body.json \
    "$BASE_URL/api/suggest")

HTTP_CODE="${SUGGEST_RESPONSE: -3}"

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Suggest failed - HTTP $HTTP_CODE"
    cat /tmp/suggest_body.json
    exit 1
fi

ITEM_COUNT=$(jq '.items | length' /tmp/suggest_body.json 2>/dev/null || echo "0")
if [ "$ITEM_COUNT" != "3" ]; then
    echo "❌ Suggest failed - expected 3 items, got $ITEM_COUNT"
    cat /tmp/suggest_body.json
    exit 1
fi

echo "✅ Suggest endpoint passed (3 items returned)"
echo ""

# Test 3: Generate endpoint
echo "3️⃣  Testing /api/generate endpoint..."
GENERATE_PAYLOAD='{
    "chosen_card": {
        "title": "Absolutisme van Lodewijk XIV",
        "head_question": "Was Lodewijk XIV een slechte koning?",
        "context": "Frankrijk in de 17e eeuw"
    },
    "options": {
        "tv": 6,
        "ka": 26,
        "theme": "Absolutisme"
    }
}'

GENERATE_RESPONSE=$(curl -s -m 30 -w "%{http_code}" \
    -H "Content-Type: application/json" \
    -d "$GENERATE_PAYLOAD" \
    -o /tmp/generate_body.json \
    "$BASE_URL/api/generate")

HTTP_CODE="${GENERATE_RESPONSE: -3}"

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Generate failed - HTTP $HTTP_CODE"
    cat /tmp/generate_body.json
    exit 1
fi

if ! jq -e '.markdown' /tmp/generate_body.json >/dev/null 2>&1; then
    echo "❌ Generate failed - missing markdown field"
    cat /tmp/generate_body.json
    exit 1
fi

MARKDOWN_LENGTH=$(jq -r '.markdown | length' /tmp/generate_body.json)
if [ "$MARKDOWN_LENGTH" -lt 100 ]; then
    echo "❌ Generate failed - markdown too short ($MARKDOWN_LENGTH chars)"
    exit 1
fi

echo "✅ Generate endpoint passed (markdown: $MARKDOWN_LENGTH chars)"
echo ""

# Cleanup
rm -f /tmp/health_body.json /tmp/suggest_body.json /tmp/generate_body.json

echo "🎉 Alle tests geslaagd!"
echo "✨ Backend is operationeel"
