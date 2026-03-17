# Deploy Helpers

이 디렉토리는 ECS 배포/롤백을 보조하는 스크립트를 담습니다.

## 최근 task definition 목록 보기

```bash
export AWS_REGION=ap-northeast-2
export ECS_TASK_FAMILY=next-redis-cache-demo-staging-app

./ops/deploy/list-ecs-taskdefs.sh
```

## 특정 revision으로 롤백

```bash
export AWS_REGION=ap-northeast-2
export ECS_CLUSTER_NAME=next-redis-cache-demo-staging-cluster
export ECS_SERVICE_NAME=next-redis-cache-demo-staging-service

./ops/deploy/rollback-ecs-service.sh \
  arn:aws:ecs:ap-northeast-2:123456789012:task-definition/next-redis-cache-demo-staging-app:12
```

기본 절차:

1. `list-ecs-taskdefs.sh`로 이전 revision 확인
2. 직전 안정 revision ARN 선택
3. `rollback-ecs-service.sh` 실행
4. `aws ecs wait services-stable` 완료 확인
5. `/api/health`와 ALB 응답 확인
