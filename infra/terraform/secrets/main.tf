provider "aws" {
  region = var.aws_region
}

locals {
  name_prefix = "${var.project_name}/${var.environment}"
  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "revalidation_secret" {
  name                    = "${local.name_prefix}/revalidation-secret"
  description             = "Next.js revalidation secret"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(local.tags, { Name = "${local.name_prefix}/revalidation-secret" })
}

resource "aws_secretsmanager_secret" "webhook_signing_secret" {
  name                    = "${local.name_prefix}/webhook-signing-secret"
  description             = "Webhook signing secret for cache invalidation"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(local.tags, { Name = "${local.name_prefix}/webhook-signing-secret" })
}
