#!/usr/bin/env bash
# Gate runner — always from web/. Usage: bash scripts/gates.sh <phase>
# Phases: contract | timeline | sketch | walk
set -uo pipefail
cd "$(dirname "$0")/.." || exit 9
echo "cwd: $(pwd)  avail: $(awk '/MemAvailable/{print int($2/1024)"MB"}' /proc/meminfo)"
case "${1:-}" in
  contract)
    node scripts/i18n-preflight.mjs 2>&1 | tail -1
    npx jest src/i18n/__tests__/ --silent --runInBand 2>&1 | tail -3 ;;
  timeline)
    npx jest src/components/timeline/ --silent --runInBand 2>&1 | tail -3 ;;
  sketch)
    npx jest src/components/sketch/ --silent --runInBand 2>&1 | tail -3 ;;
  walk)
    CHROME_PATH=/usr/bin/google-chrome node scripts/i18n-deep-walk.mjs 2>&1 | tail -4 ;;
  *) echo "usage: gates.sh contract|timeline|sketch|walk"; exit 2 ;;
esac
