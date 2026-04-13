#!/usr/bin/env bash

set -euo pipefail

APP_BASE_URL="${APP_BASE_URL:-http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com}"
SUMMARY_OUT="${K6_SUMMARY_OUT:-docs/load-test/rendering-strategies.json}"

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed."
  echo "macOS(Homebrew): brew install k6"
  echo "Run again after installing k6."
  exit 1
fi

mkdir -p "$(dirname "$SUMMARY_OUT")"

APP_BASE_URL="$APP_BASE_URL" \
  k6 run \
  --summary-export "$SUMMARY_OUT" \
  scripts/k6-rendering-strategies.js

echo ""
echo "k6 rendering strategy comparison complete"
echo "Summary: $SUMMARY_OUT"
