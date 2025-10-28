#!/usr/bin/env bash
set -euo pipefail

# Test script voor lokale ontwikkeling
# Controleert of de server draait en voert rooktests uit

BASE_URL="http://localhost:8080"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf "• %s\n" "$*"; }
success() { printf "✅ %s\n" "$*"; }
error() { printf "❌ %s\n" "$*"; exit 1; }

# Controleer of server draait
log "Controleren of server draait op $BASE_URL..."
if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
  error "Server draait niet op $BASE_URL. Start eerst de server met: scripts/server-control.sh start"
fi

success "Server is bereikbaar"

# Voer rooktests uit
log "Uitvoeren van rooktests..."
if [ -f "$SCRIPT_DIR/rooktest.sh" ]; then
  bash "$SCRIPT_DIR/rooktest.sh" "$BASE_URL"
else
  error "rooktest.sh niet gevonden in $SCRIPT_DIR"
fi

success "Alle tests geslaagd!"
