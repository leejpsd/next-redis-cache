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

variable "recovery_window_in_days" {
  description = "Secrets Manager recovery window"
  type        = number
  default     = 7
}
