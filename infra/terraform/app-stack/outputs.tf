output "alb_dns_name" {
  description = "Application load balancer DNS name"
  value       = aws_lb.app.dns_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.app.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.app.name
}

output "ecs_task_family" {
  description = "ECS task definition family"
  value       = aws_ecs_task_definition.app.family
}

output "app_base_url" {
  description = "Public application base URL configured in the task"
  value       = var.app_base_url
}

output "alb_http_url" {
  description = "HTTP URL for the ALB"
  value       = "http://${aws_lb.app.dns_name}"
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "target_group_arn_suffix" {
  description = "Target group ARN suffix for CloudWatch"
  value       = aws_lb_target_group.app.arn_suffix
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch"
  value       = aws_lb.app.arn_suffix
}
