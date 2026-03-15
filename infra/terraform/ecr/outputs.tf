output "repository_name" {
  value       = aws_ecr_repository.app.name
  description = "ECR repository name"
}

output "repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URL"
}
