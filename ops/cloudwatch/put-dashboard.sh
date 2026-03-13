#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ALB_ARN_SUFFIX:?ALB_ARN_SUFFIX is required}"
: "${TARGET_GROUP_ARN_SUFFIX:?TARGET_GROUP_ARN_SUFFIX is required}"
: "${ECS_CLUSTER_NAME:?ECS_CLUSTER_NAME is required}"
: "${ECS_SERVICE_NAME:?ECS_SERVICE_NAME is required}"

DASHBOARD_NAME="${DASHBOARD_NAME:-next-redis-cache-demo}"
TEMPLATE="$(dirname "$0")/dashboard.json"
RENDERED="$(mktemp)"

trap 'rm -f "$RENDERED"' EXIT

sed \
  -e "s|\${AWS_REGION}|${AWS_REGION}|g" \
  -e "s|\${ALB_ARN_SUFFIX}|${ALB_ARN_SUFFIX}|g" \
  -e "s|\${TARGET_GROUP_ARN_SUFFIX}|${TARGET_GROUP_ARN_SUFFIX}|g" \
  -e "s|\${ECS_CLUSTER_NAME}|${ECS_CLUSTER_NAME}|g" \
  -e "s|\${ECS_SERVICE_NAME}|${ECS_SERVICE_NAME}|g" \
  "$TEMPLATE" > "$RENDERED"

aws cloudwatch put-dashboard \
  --dashboard-name "$DASHBOARD_NAME" \
  --dashboard-body "$(cat "$RENDERED")" \
  --region "$AWS_REGION"

echo "Dashboard applied: $DASHBOARD_NAME"
