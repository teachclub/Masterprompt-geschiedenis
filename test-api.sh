#!/usr/bin/env bash
set -euo pipefail

# Test script voor de Masterprompt API
BASE_URL="http://localhost:8080"

log() { printf "• %s\n" "$*"; }
success() { printf "✅ %s\n" "$*"; }
error() { printf "❌ %s\n" "$*"; exit 1; }

# Controleer of server draait, start indien nodig
log "Controleren of server draait..."
if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
  log "Server niet bereikbaar, proberen te starten..."
  if [ -f "scripts/server-control.sh" ]; then
    bash scripts/server-control.sh start
    
    # Wacht tot server beschikbaar is (max 30 seconden)
    log "Wachten tot server beschikbaar is..."
    for i in {1..30}; do
      if curl -s "$BASE_URL/health" >/dev/null 2>&1; then
        success "Server is nu bereikbaar na ${i} seconden"
        break
      fi
      if [ $i -eq 30 ]; then
        error "Server niet bereikbaar na 30 seconden wachten"
      fi
      sleep 1
    done
  else
    error "Server draait niet en scripts/server-control.sh niet gevonden"
  fi
else
  success "Server is al bereikbaar"
fi

# Test 1: /api/suggest
log "Test 1: POST /api/suggest"
SUGGEST_PAYLOAD='{
  "ka": "De bijzondere plaats van de Nederlandse Republiek",
  "context": "Onderbelichte rol van vrouwen",
  "verplichteBronnen": "Stadsarchief Amsterdam; NIOD; Nationaal Archief"
}'

curl -sS "$BASE_URL/api/suggest" \
  -H 'Content-Type: application/json' \
  -d "$SUGGEST_PAYLOAD" \
  -o suggest_result.json

if [ $? -eq 0 ]; then
  success "Suggest API werkt - resultaat opgeslagen in suggest_result.json"
  echo "Aantal suggesties: $(jq '.count // 0' suggest_result.json)"
  echo "Eerste titel: $(jq -r '.suggestions[0].title // "geen"' suggest_result.json)"
else
  error "Suggest API gefaald"
fi

# Test 2: /api/generate (gebruik eerste suggestie)
log "Test 2: POST /api/generate"
FIRST_TITLE=$(jq -r '.suggestions[0].title // ""' suggest_result.json)

if [ -n "$FIRST_TITLE" ] && [ "$FIRST_TITLE" != "null" ]; then
  GENERATE_PAYLOAD="{
    \"keuze\": \"$FIRST_TITLE\",
    \"ka\": \"De bijzondere plaats van de Nederlandse Republiek\",
    \"context\": \"Onderbelichte rol van vrouwen\"
  }"
  
  curl -sS "$BASE_URL/api/generate" \
    -H 'Content-Type: application/json' \
    -d "$GENERATE_PAYLOAD" \
    -o generate_result.json
  
  if [ $? -eq 0 ]; then
    success "Generate API werkt - resultaat opgeslagen in generate_result.json"
    jq -r '.markdown' generate_result.json > LES.md
    success "Markdown opgeslagen in LES.md"
    echo "Markdown lengte: $(wc -c < LES.md) karakters"
  else
    error "Generate API gefaald"
  fi
else
  log "Geen geldige titel gevonden, overslaan van generate test"
fi

success "API tests voltooid"
