# CloudWatch Dashboard/Alarm Setup

이 디렉토리는 M3 관측성 체크리스트 중 아래 항목을 재현 가능한 방식으로 관리하기 위한 파일입니다.

- CloudWatch 대시보드 구성
- 알람 3종(5xx, 지연, Redis 오류)

## 1) 사전 준비

아래 값을 확인하세요.

- `AWS_REGION`
- `ALB_ARN_SUFFIX` (예: `app/my-alb/0123456789abcdef`)
- `TARGET_GROUP_ARN_SUFFIX` (예: `targetgroup/my-tg/0123456789abcdef`)
- `ECS_CLUSTER_NAME`
- `ECS_SERVICE_NAME`
- `SNS_TOPIC_ARN` (선택, 알람 알림용)

## 2) 대시보드 적용

```bash
export AWS_REGION=ap-northeast-2
export ALB_ARN_SUFFIX=app/my-alb/0123456789abcdef
export TARGET_GROUP_ARN_SUFFIX=targetgroup/my-tg/0123456789abcdef
export ECS_CLUSTER_NAME=my-cluster
export ECS_SERVICE_NAME=my-service

./ops/cloudwatch/put-dashboard.sh
```

## 3) 알람 3종 적용

```bash
export AWS_REGION=ap-northeast-2
export ALB_ARN_SUFFIX=app/my-alb/0123456789abcdef
export TARGET_GROUP_ARN_SUFFIX=targetgroup/my-tg/0123456789abcdef
export ECS_SERVICE_NAME=my-service
export SNS_TOPIC_ARN=arn:aws:sns:ap-northeast-2:123456789012:my-topic

./ops/cloudwatch/create-alarms.sh
```

## 4) 운영 기준

- `alb-5xx`: 5분 누적 5xx > 5
- `target-response-p95`: 5분간 p95 > 0.8s
- `redis-errors`: 1분 내 RedisErrors > 0

Redis 오류 알람은 `NextRedisCacheDemo/RedisErrors` 커스텀 메트릭 발행이 선행되어야 합니다.
