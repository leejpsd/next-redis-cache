#!/usr/bin/env bash

set -euo pipefail

APP_BASE_URL="${APP_BASE_URL:-http://next-redis-cache-staging-alb-1315597713.ap-southeast-2.elb.amazonaws.com}"
BROWSER_MEASURE_OUT="${BROWSER_MEASURE_OUT:-docs/load-test/browser-strategies.json}"

APP_BASE_URL="$APP_BASE_URL" \
BROWSER_MEASURE_OUT="$BROWSER_MEASURE_OUT" \
node scripts/measure-browser-strategies.mjs
