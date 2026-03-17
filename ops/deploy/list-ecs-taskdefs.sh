#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ECS_TASK_FAMILY:?ECS_TASK_FAMILY is required}"

aws ecs list-task-definitions \
  --region "$AWS_REGION" \
  --family-prefix "$ECS_TASK_FAMILY" \
  --sort DESC
