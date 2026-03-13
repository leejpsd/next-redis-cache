#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?AWS_REGION is required}"
: "${ALB_ARN_SUFFIX:?ALB_ARN_SUFFIX is required}"
: "${TARGET_GROUP_ARN_SUFFIX:?TARGET_GROUP_ARN_SUFFIX is required}"
: "${ECS_SERVICE_NAME:?ECS_SERVICE_NAME is required}"

ALARM_PREFIX="${ALARM_PREFIX:-next-redis-cache-demo}"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-}"

ALARM_ACTION_ARGS=()
if [ -n "$SNS_TOPIC_ARN" ]; then
  ALARM_ACTION_ARGS+=(--alarm-actions "$SNS_TOPIC_ARN")
fi

# 1) 5xx 급증
aws cloudwatch put-metric-alarm \
  --alarm-name "${ALARM_PREFIX}-alb-5xx" \
  --alarm-description "ALB/Target 5xx sum > 5 (5m)" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value="$ALB_ARN_SUFFIX" Name=TargetGroup,Value="$TARGET_GROUP_ARN_SUFFIX" \
  --treat-missing-data notBreaching \
  "${ALARM_ACTION_ARGS[@]}" \
  --region "$AWS_REGION"

# 2) 지연 증가 (p95 > 0.8s)
aws cloudwatch put-metric-alarm \
  --alarm-name "${ALARM_PREFIX}-target-response-p95" \
  --alarm-description "TargetResponseTime p95 > 0.8s (5m)" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --extended-statistic p95 \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 0.8 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value="$ALB_ARN_SUFFIX" Name=TargetGroup,Value="$TARGET_GROUP_ARN_SUFFIX" \
  --treat-missing-data notBreaching \
  "${ALARM_ACTION_ARGS[@]}" \
  --region "$AWS_REGION"

# 3) Redis 오류 발생 (custom metric)
aws cloudwatch put-metric-alarm \
  --alarm-name "${ALARM_PREFIX}-redis-errors" \
  --alarm-description "App RedisErrors sum > 0 (1m)" \
  --metric-name RedisErrors \
  --namespace NextRedisCacheDemo \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=Service,Value="$ECS_SERVICE_NAME" \
  --treat-missing-data notBreaching \
  "${ALARM_ACTION_ARGS[@]}" \
  --region "$AWS_REGION"

echo "Alarms applied with prefix: $ALARM_PREFIX"
