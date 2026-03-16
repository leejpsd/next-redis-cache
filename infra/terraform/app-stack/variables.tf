variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "next-redis-cache-demo"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "staging"
}

variable "vpc_id" {
  description = "Existing VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for ALB"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS/Redis"
  type        = list(string)
}

variable "container_port" {
  description = "Next.js container port"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "ECS desired task count"
  type        = number
  default     = 2
}

variable "task_cpu" {
  description = "Fargate task CPU"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate task memory"
  type        = number
  default     = 1024
}

variable "ecr_image_uri" {
  description = "Full ECR image URI including tag"
  type        = string
}

variable "app_base_url" {
  description = "Public application base URL"
  type        = string
}

variable "revalidation_secret_arn" {
  description = "Secrets Manager ARN for REVALIDATION_SECRET"
  type        = string
}

variable "webhook_signing_secret_arn" {
  description = "Secrets Manager ARN for WEBHOOK_SIGNING_SECRET"
  type        = string
}

variable "certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS listener"
  type        = string
  default     = null
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}
