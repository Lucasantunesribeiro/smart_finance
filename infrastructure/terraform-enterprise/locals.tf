locals {
  name_prefix = "${var.project_name}-${var.environment}"
  enable_https = var.acm_certificate_arn != ""
  allowed_origins = var.enable_cloudfront ? concat(var.allowed_origins, ["https://${aws_cloudfront_distribution.app[0].domain_name}"]) : var.allowed_origins
  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
