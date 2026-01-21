output "alb_dns_name" {
  value = aws_lb.app.dns_name
}

output "cloudfront_domain" {
  value       = var.enable_cloudfront ? aws_cloudfront_distribution.app[0].domain_name : null
  description = "Use this for HTTPS when no custom domain is available."
}

output "ecr_frontend" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend" {
  value = aws_ecr_repository.backend.repository_url
}

output "github_deploy_role_arn" {
  value = aws_iam_role.github_deploy.arn
}

output "ecs_private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_backend" {
  value = aws_ecs_service.backend.name
}

output "ecs_service_frontend" {
  value = aws_ecs_service.frontend.name
}
