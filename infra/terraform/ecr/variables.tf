variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "next-redis-cache-demo"
}

variable "repository_name" {
  description = "ECR repository name"
  type        = string
  default     = "next-redis-cache-demo"
}

variable "image_tag_mutability" {
  description = "ECR tag mutability"
  type        = string
  default     = "IMMUTABLE"
}

variable "scan_on_push" {
  description = "Enable image scanning on push"
  type        = bool
  default     = true
}
