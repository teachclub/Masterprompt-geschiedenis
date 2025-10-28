#!/usr/bin/env bash
set -euo pipefail

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
  
  log "Starten van server op poort $PORT..."
  node "$SERVER_SCRIPT" &
  SERVER_PID=$!
  
  # Wacht even en controleer of de server daadwerkelijk draait
  sleep 2
  if kill -0 $SERVER_PID 2>/dev/null; then
    success "Server gestart (PID: $SERVER_PID) op poort $PORT"
  else
    error "Server kon niet worden gestart"
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
  *)
    echo "Gebruik: $0 {start|stop|restart|status}"
    echo ""
    echo "Commando's:"
    echo "  start   - Start de server"
    echo "  stop    - Stop de server"
    echo "  restart - Herstart de server"
    echo "  status  - Toon server status"
    exit 1
    ;;
esac
