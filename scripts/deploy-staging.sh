#!/usr/bin/env bash

set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-273517699922}"
ECR_REPOSITORY="${ECR_REPOSITORY:-next-redis-cache}"
IMAGE_TAG="${IMAGE_TAG:-staging}"
ECS_CLUSTER_NAME="${ECS_CLUSTER_NAME:-next-redis-cache-staging-cluster}"
ECS_SERVICE_NAME="${ECS_SERVICE_NAME:-next-redis-cache-staging-service}"
DOCKER_PLATFORM="${DOCKER_PLATFORM:-linux/amd64}"

IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo ""
echo "[1/3] ECR login"
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo ""
echo "[2/3] Build and push: ${IMAGE_URI}"
docker buildx build \
  --platform "${DOCKER_PLATFORM}" \
  -t "${IMAGE_URI}" \
  --push \
  .

echo ""
echo "[3/3] Force ECS deployment"
aws ecs update-service \
  --region "${AWS_REGION}" \
  --cluster "${ECS_CLUSTER_NAME}" \
  --service "${ECS_SERVICE_NAME}" \
  --force-new-deployment

echo ""
echo "Done."
echo "Image: ${IMAGE_URI}"
echo "Cluster: ${ECS_CLUSTER_NAME}"
echo "Service: ${ECS_SERVICE_NAME}"
