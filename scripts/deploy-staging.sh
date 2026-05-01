#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-273517699922}"
ECR_REPOSITORY="${ECR_REPOSITORY:-next-redis-cache}"
ECS_CLUSTER_NAME="${ECS_CLUSTER_NAME:-next-redis-cache-staging-cluster}"
ECS_SERVICE_NAME="${ECS_SERVICE_NAME:-next-redis-cache-staging-service}"
ECS_TASK_FAMILY="${ECS_TASK_FAMILY:-next-redis-cache-staging-app}"
CONTAINER_NAME="${CONTAINER_NAME:-next-app}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"
DEPLOYMENT_VERSION="${DEPLOYMENT_VERSION:-$(git rev-parse --short=12 HEAD)}"

REPO_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}"
IMAGE_URI_STAGING="${REPO_BASE}:staging"
IMAGE_URI_VERSION="${REPO_BASE}:${DEPLOYMENT_VERSION}"

echo ""
echo "[1/4] ECR login"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo ""
echo "[2/4] Build and push: ${IMAGE_URI_VERSION} + :staging"
# 같은 이미지에 두 태그를 동시에 부여한다.
# - :staging      → 가장 최근 staging 빌드를 가리키는 movable tag
# - :<git-sha>    → 실제 task definition이 가리키는 immutable tag (감사·롤백용)
docker buildx build \
  --platform "${DOCKER_PLATFORM}" \
  --build-arg "DEPLOYMENT_VERSION=${DEPLOYMENT_VERSION}" \
  -t "${IMAGE_URI_STAGING}" \
  -t "${IMAGE_URI_VERSION}" \
  --push \
  .

echo ""
echo "[3/4] Register new task definition revision pointing to ${DEPLOYMENT_VERSION}"
# 매 배포마다 task definition을 새 revision으로 등록해, ECS가 명시적으로 새 image URI를 풀링하게 한다.
# 같은 :staging 태그만 push하면 ECS가 디지스트 캐시로 옛 이미지를 계속 쓰는 함정이 있어 이 단계가 필수다.
TD_JSON=$(mktemp)
trap 'rm -f "$TD_JSON"' EXIT

aws ecs describe-task-definition \
  --region "${AWS_REGION}" \
  --task-definition "${ECS_TASK_FAMILY}" \
  --query 'taskDefinition' \
  > "$TD_JSON"

NEW_TD_ARN=$(jq \
  --arg IMAGE "$IMAGE_URI_VERSION" \
  --arg CONTAINER "$CONTAINER_NAME" \
  --arg VERSION "$DEPLOYMENT_VERSION" \
  '
    del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)
    | .containerDefinitions |= map(
        if .name == $CONTAINER then
          .image = $IMAGE
          | .environment = (
              (.environment // [])
              | map(select(.name != "DEPLOYMENT_VERSION" and .name != "GIT_HASH"))
              + [{name: "DEPLOYMENT_VERSION", value: $VERSION},
                 {name: "GIT_HASH", value: $VERSION}]
            )
        else . end
      )
  ' "$TD_JSON" \
  | aws ecs register-task-definition \
      --region "${AWS_REGION}" \
      --cli-input-json file:///dev/stdin \
      --query 'taskDefinition.taskDefinitionArn' \
      --output text)

echo "Registered: ${NEW_TD_ARN}"

echo ""
echo "[4/4] Update service to new task definition"
aws ecs update-service \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER_NAME}" \
  --service "${ECS_SERVICE_NAME}" \
  --task-definition "${NEW_TD_ARN}" \
  --force-new-deployment \
  > /dev/null

echo ""
echo "Done."
echo "Image: ${IMAGE_URI_VERSION}"
echo "Also tagged: ${IMAGE_URI_STAGING}"
echo "Task definition: ${NEW_TD_ARN}"
echo "Deployment version: ${DEPLOYMENT_VERSION}"
echo "Cluster: ${ECS_CLUSTER_NAME}"
echo "Service: ${ECS_SERVICE_NAME}"
