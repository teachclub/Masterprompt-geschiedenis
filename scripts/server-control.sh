#!/usr/bin/env bash
set -euo pipefail

# Laad omgevingsvariabelen uit .env bestand
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

PORT="${PORT:-8080}"
SERVER_SCRIPT="server.mjs"

log() { printf "• %s\n" "$*"; }
success() { printf "✅ %s\n" "$*"; }
error() { printf "❌ %s\n" "$*"; exit 1; }

stop_server() {
  log "Zoeken naar processen op poort $PORT..."
  
  # Zoek PID van proces op de poort
  PID=$(lsof -ti :$PORT 2>/dev/null || true)
  
  if [ -z "$PID" ]; then
    log "Geen proces gevonden op poort $PORT"
    return 0
  fi
  
  log "Gevonden proces $PID op poort $PORT, stoppen..."
  kill -9 $PID 2>/dev/null || true
  
  # Wacht even en controleer of het echt gestopt is
  sleep 1
  if lsof -ti :$PORT >/dev/null 2>&1; then
    error "Kon proces op poort $PORT niet stoppen"
  else
    success "Server gestopt (PID: $PID)"
  fi
}

start_server() {
  if [ ! -f "$SERVER_SCRIPT" ]; then
    error "Server script '$SERVER_SCRIPT' niet gevonden"
  fi
  
  # Controleer of vereiste env vars aanwezig zijn
  if [ -z "${GCP_PROJECT_ID:-}" ]; then
    error "GCP_PROJECT_ID ontbreekt. Vul .env bestand in met je GCP project ID"
  fi
  
  log "Starten van server op poort $PORT..."
  log "GCP Project: ${GCP_PROJECT_ID}"
  log "Vertex regio: ${GEMINI_VERTEX_LOCATION:-europe-west1}"
  
  node "$SERVER_SCRIPT" &
  SERVER_PID=$!
  
  # Wacht even en controleer of de server daadwerkelijk draait
  sleep 3
  if kill -0 $SERVER_PID 2>/dev/null && curl -s "http://localhost:$PORT/health" >/dev/null 2>&1; then
    success "Server gestart (PID: $SERVER_PID) op poort $PORT"
    log "Test met: curl http://localhost:$PORT/health"
  else
    error "Server kon niet worden gestart. Controleer de logs hierboven."
  fi
}

restart_server() {
  log "Server herstarten..."
  stop_server
  start_server
}

show_status() {
  PID=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    success "Server draait (PID: $PID) op poort $PORT"
  else
    log "Geen server gevonden op poort $PORT"
  fi
}

find_servers() {
  log "Zoeken naar Node.js servers op verschillende poorten..."
  
  # Zoek naar Node.js processen
  local node_procs=$(ps aux | grep -E "node.*server\.mjs|node.*app\.js|node.*index\.js" | grep -v grep || true)
  if [ -n "$node_procs" ]; then
    success "Gevonden Node.js processen:"
    echo "$node_procs" | while read line; do
      echo "  $line"
    done
    echo
  fi
  
  # Zoek op veelgebruikte poorten
  local common_ports="3000 3001 4000 5000 8000 8080 8081 9000"
  local found_any=false
  
  for port in $common_ports; do
    local pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
      local proc_info=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
      success "Poort $port: PID $pid ($proc_info)"
      found_any=true
    fi
  done
  
  if [ "$found_any" = false ]; then
    log "Geen servers gevonden op veelgebruikte poorten ($common_ports)"
  fi
}

case "${1:-}" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  status)
    show_status
    ;;
  find)
    find_servers
    ;;
  *)
    echo "Gebruik: $0 {start|stop|restart|status|find}"
    echo ""
    echo "Commando's:"
    echo "  start   - Start de server"
    echo "  stop    - Stop de server"
    echo "  restart - Herstart de server"
    echo "  status  - Toon server status"
    echo "  find    - Zoek naar draaiende servers"
    exit 1
    ;;
esac
