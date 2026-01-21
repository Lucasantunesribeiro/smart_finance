variable "project_name" {
  type    = string
  default = "smartfinance"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "aws_region" {
  type    = string
  default = "sa-east-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.10.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.10.10.0/24", "10.10.20.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.10.30.0/24", "10.10.40.0/24"]
}

variable "db_subnet_cidrs" {
  type    = list(string)
  default = ["10.10.50.0/24", "10.10.60.0/24"]
}

variable "enable_cloudfront" {
  type    = bool
  default = true
}

variable "acm_certificate_arn" {
  type    = string
  default = ""
}

variable "frontend_cpu" {
  type    = number
  default = 512
}

variable "frontend_memory" {
  type    = number
  default = 1024
}

variable "backend_cpu" {
  type    = number
  default = 512
}

variable "backend_memory" {
  type    = number
  default = 1024
}

variable "frontend_image_tag" {
  type    = string
  default = "latest"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

variable "frontend_desired_count" {
  type    = number
  default = 2
}

variable "backend_desired_count" {
  type    = number
  default = 2
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_backup_retention_days" {
  type    = number
  default = 7
}

variable "db_backup_window" {
  type    = string
  default = "03:00-06:00"
}

variable "db_maintenance_window" {
  type    = string
  default = "sun:06:00-sun:07:00"
}

variable "db_multi_az" {
  type    = bool
  default = true
}

variable "db_apply_immediately" {
  type    = bool
  default = false
}

variable "db_name" {
  type    = string
  default = "smartfinance"
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "nat_gateway_count" {
  type    = number
  default = 1
}

variable "allowed_origins" {
  type    = list(string)
  default = ["http://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/"]
}

variable "cloudfront_cache_policy_id" {
  type    = string
  default = "658327ea-f89d-4fab-a63d-7e88639e58f6"
}

variable "cloudfront_origin_request_policy_id" {
  type    = string
  default = "244a0b68-9cf6-4f33-8c86-4efd5240f316"
}

variable "cloudfront_response_headers_policy_id" {
  type    = string
  default = "67f77235-18c2-4c40-bb6c-0dca930a17db"
}

variable "enable_guardduty" {
  type    = bool
  default = true
}

variable "enable_securityhub" {
  type    = bool
  default = true
}

variable "github_repo" {
  type    = string
  default = "OWNER/REPO"
}

variable "github_branch" {
  type    = string
  default = "main"
}
