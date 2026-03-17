#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ECS_CLUSTER_NAME:?ECS_CLUSTER_NAME is required}"
: "${ECS_SERVICE_NAME:?ECS_SERVICE_NAME is required}"

TASK_DEF_ARN="${1:-}"

if [ -z "$TASK_DEF_ARN" ]; then
  echo "usage: $0 <target-task-definition-arn>" >&2
  exit 1
fi

aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER_NAME" \
  --service "$ECS_SERVICE_NAME" \
  --task-definition "$TASK_DEF_ARN"

aws ecs wait services-stable \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER_NAME" \
  --services "$ECS_SERVICE_NAME"

echo "Rolled back service to: $TASK_DEF_ARN"
