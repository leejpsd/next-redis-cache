output "revalidation_secret_arn" {
  description = "ARN for REVALIDATION_SECRET"
  value       = aws_secretsmanager_secret.revalidation_secret.arn
}

output "webhook_signing_secret_arn" {
  description = "ARN for WEBHOOK_SIGNING_SECRET"
  value       = aws_secretsmanager_secret.webhook_signing_secret.arn
}
