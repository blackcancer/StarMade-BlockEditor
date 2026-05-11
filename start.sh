#!/usr/bin/env sh
# StarMade Block Editor — production startup script for Linux, macOS, and WSL.
#
# Usage:
#   ./start.sh            # install deps if missing, build if dist is missing, start app
#   ./start.sh --rebuild  # force a production rebuild before starting
#   PORT=8080 ./start.sh  # override the default server port

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

PORT="${PORT:-3847}"
APP_URL="http://localhost:${PORT}"
FORCE_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --rebuild|--build)
      FORCE_BUILD=1
      ;;
    --help|-h)
      echo "StarMade Block Editor startup"
      echo ""
      echo "Usage: ./start.sh [--rebuild]"
      echo "Environment: PORT=3847 by default"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Use --help for usage." >&2
      exit 2
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "[BlockEditor] Node.js is required but was not found in PATH." >&2
  echo "Install Node.js 20+ and retry." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[BlockEditor] npm is required but was not found in PATH." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "[BlockEditor] Dependencies not found; running npm install..."
  npm install
fi

if [ "$FORCE_BUILD" -eq 1 ] || [ ! -f "server/dist/index.js" ] || [ ! -f "client/dist/index.html" ]; then
  echo "[BlockEditor] Building production server/client..."
  npm run build
else
  echo "[BlockEditor] Existing production build found. Use --rebuild to force a rebuild."
fi

echo "[BlockEditor] Starting app on ${APP_URL}"

# Best-effort browser open. The server remains attached to this terminal.
(
  sleep 2
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$APP_URL" >/dev/null 2>&1 || true
  fi
) &

NODE_ENV=production PORT="$PORT" npm start
