# ECR Terraform

M4의 ECR 리포지토리 구성을 Terraform으로 관리합니다.

## 1) 실행 준비

```bash
cd infra/terraform/ecr
cp terraform.tfvars.example terraform.tfvars
```

`terraform.tfvars`에서 리전/리포지토리 이름을 조정하세요.

## 2) 배포

```bash
terraform init
terraform plan
terraform apply
```

적용 후 `repository_url` 출력값을 CI/CD 또는 배포 스크립트에서 사용합니다.
