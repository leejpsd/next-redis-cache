# GitHub Actions Notes

## CI

- `ci.yml`
- lint, typecheck, test, build 실행
- CI build에서는 `DISABLE_REDIS_CACHE_HANDLER=true`로 Redis 없이 빌드 검증

## Security

- `security.yml`
- `npm audit --omit=dev` 실행

## Staging Deploy

- `deploy-staging.yml`
- `main` 머지 또는 수동 실행 시 이미지 빌드/푸시 후 ECS 서비스 갱신

필요한 GitHub Secrets:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `AWS_ROLE_TO_ASSUME`
- `ECR_REPOSITORY`
- `ECS_CLUSTER_NAME`
- `ECS_SERVICE_NAME`
- `ECS_TASK_FAMILY`
