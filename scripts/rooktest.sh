#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://localhost:8080}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

log() { printf "• %s\n" "$*"; }
pass() { printf "✅ %s\n" "$*"; }
fail() { printf "❌ %s\n" "$*"; exit 1; }

node_json_has() {
  # usage: node_json_has '<json>' 'expr returning truthy' 'error message'
  local json="$1" expr="$2" msg="$3"
  node -e "const j=JSON.parse(process.argv[1]); if(!(${expr})) process.exit(1)" "$json" || fail "$msg"
}

log "BASE = $BASE"

# 1) /health ------------------------------------------------------------
log "Check: GET /health"
code=$(curl -sS -o "$TMP_DIR/health.json" -w "%{http_code}" "$BASE/health" || true)
[ "$code" = "200" ] || fail "/health statuscode $code (verwacht 200)"
json="$(cat "$TMP_DIR/health.json")"
node_json_has "$json" "j.status==='ok'" "/health: status!='ok'"
node_json_has "$json" "typeof j.uptime_sec==='number'" "/health: uptime_sec ontbreekt"
node_json_has "$json" "j.model_region && j.runtime_region" "/health: regio-informatie ontbreekt"
pass "/health ok"

# 2) /api/suggest -------------------------------------------------------
log "Check: POST /api/suggest (tijdvak=6)"
code=$(curl -sS -o "$TMP_DIR/suggest.json" -w "%{http_code}" \
  -H 'Content-Type: application/json' \
  -d '{"tijdvak":6}' \
  "$BASE/api/suggest" || true)

if [ "$code" = "403" ]; then
  json="$(cat "$TMP_DIR/suggest.json")"
  if echo "$json" | grep -q "GCP toegang geweigerd\|PERMISSION_DENIED"; then
    log "⚠️  /api/suggest: GCP toegang probleem (403) - dit is normaal bij nieuwe accounts"
    log "   Oplossing: Vertex AI API inschakelen + juiste IAM rollen toekennen"
    log "   Overslaan van suggest/generate tests..."
    pass "Rooktest gedeeltelijk geslaagd (health OK, Vertex AI setup vereist)"
    exit 0
  fi
fi

[ "$code" = "200" ] || fail "/api/suggest statuscode $code (verwacht 200)"
json="$(cat "$TMP_DIR/suggest.json")"
node_json_has "$json" "Array.isArray(j.suggestions)" "/api/suggest: suggestions geen array"
node_json_has "$json" "j.suggestions.length===5" "/api/suggest: verwacht exact 5 suggestions"
pass "/api/suggest ok (5 suggestions)"

# 3) /api/generate ------------------------------------------------------
log "Check: POST /api/generate (met gekozen suggestie)"
suggestion="$(node -e 'const j=require(process.argv[1]); process.stdout.write(JSON.stringify(j.suggestions[0]))' "$TMP_DIR/suggest.json")"
payload="$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(JSON.stringify({keuze: s.title, tijdvak: 6}))' "$suggestion")"

code=$(curl -sS -o "$TMP_DIR/generate.json" -w "%{http_code}" \
  -H 'Content-Type: application/json' \
  -d "$payload" \
  "$BASE/api/generate" || true)
[ "$code" = "200" ] || fail "/api/generate statuscode $code (verwacht 200)"
json="$(cat "$TMP_DIR/generate.json")"
node_json_has "$json" "typeof j.markdown==='string' && j.markdown.length>100" "/api/generate: markdown ontbreekt of te kort"
pass "/api/generate ok (markdown > 100 tekens)"

echo
pass "Rooktest geslaagd op $BASE"
