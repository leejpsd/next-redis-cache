# Secrets Terraform

이 스택은 앱에서 사용하는 Secrets Manager 비밀 2개를 생성합니다.

- `REVALIDATION_SECRET`
- `WEBHOOK_SIGNING_SECRET`

이 단계는 "비밀 그릇"만 생성합니다. 실제 값은 Terraform state에 남기지 않도록 `aws secretsmanager put-secret-value`로 별도 주입하는 방식을 권장합니다.

## 준비

```bash
cd infra/terraform/secrets
cp terraform.tfvars.example terraform.tfvars
```

## 배포

```bash
terraform init
terraform plan
terraform apply
```

적용 후 출력된 ARN을 `infra/terraform/app-stack/terraform.tfvars`의 아래 필드에 넣습니다.

- `revalidation_secret_arn`
- `webhook_signing_secret_arn`

## 실제 값 주입

```bash
aws secretsmanager put-secret-value \
  --secret-id <revalidation_secret_arn> \
  --secret-string '<strong-random-secret>'

aws secretsmanager put-secret-value \
  --secret-id <webhook_signing_secret_arn> \
  --secret-string '<strong-random-secret>'
```
