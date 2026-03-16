# App Stack Terraform

이 스택은 아래 구조를 그대로 만듭니다.

`ALB -> Next.js ECS task 2개 -> shared Redis 1개`

포함 리소스:

- ALB + Target Group + HTTP/HTTPS Listener
- ECS Cluster + Fargate Service (`desired_count = 2`)
- ElastiCache Redis 단일 노드
- CloudWatch Log Group
- ECS 실행/태스크 IAM Role
- Secrets Manager 기반 앱 시크릿 주입

네트워크는 새로 만들지 않고, 기존 VPC/Subnet을 주입받습니다.

## 준비

```bash
cd infra/terraform/app-stack
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`에 아래 값을 채웁니다.

- `vpc_id`
- `public_subnet_ids`
- `private_subnet_ids`
- `ecr_image_uri`
- `app_base_url`
- `revalidation_secret_arn`
- `webhook_signing_secret_arn`
- `certificate_arn` (HTTPS를 쓸 경우)

## 배포

```bash
terraform init
terraform plan
terraform apply
```

## 메모

- 현재 Redis는 단일 노드로 시작합니다. 운영 고도화 시 `multi_az_enabled`, `automatic_failover_enabled` 확장 예정입니다.
- `ops/cloudwatch/*` 대시보드 스크립트는 이 스택의 `alb_arn_suffix`, `target_group_arn_suffix`, `ecs_service_name` 출력값과 연결됩니다.
