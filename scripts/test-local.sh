#!/usr/bin/env bash
set -euo pipefail

# Test script voor lokale ontwikkeling
# Controleert of de server draait en voert rooktests uit

BASE_URL="http://localhost:8080"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf "• %s\n" "$*"; }
success() { printf "✅ %s\n" "$*"; }
error() { printf "❌ %s\n" "$*"; exit 1; }

# Controleer of server draait, start indien nodig
log "Controleren of server draait op $BASE_URL..."
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

# Voer rooktests uit
log "Uitvoeren van rooktests..."
if [ -f "$SCRIPT_DIR/rooktest.sh" ]; then
  bash "$SCRIPT_DIR/rooktest.sh" "$BASE_URL"
else
  error "rooktest.sh niet gevonden in $SCRIPT_DIR"
fi

success "Alle tests geslaagd!"
