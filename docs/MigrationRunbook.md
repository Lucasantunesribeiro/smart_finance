# Migration Runbook - SmartFinance

Pre-checks
- Confirmar conta AWS nova, billing e quotas (ECS, ALB, EIP, RDS, NAT).
- Confirmar dominio e DNS (Route53 ou externo). Sem dominio, usar CloudFront.
- Confirmar GitHub OIDC e role de deploy criada pelo Terraform.
- Confirmar Secrets Manager criado via Terraform.

Bootstrap AWS (primeira vez)
1) Configurar AWS CLI profile com MFA.
2) (Opcional) Criar bucket de remote state + DynamoDB lock.
3) Aplicar Terraform em `infrastructure/terraform-enterprise`.
4) Salvar outputs do Terraform (ALB DNS, CloudFront, ECR, role OIDC).

Deploy inicial (infra)
1) `terraform init`.
2) `terraform apply`.
3) Validar CloudTrail/Config/GuardDuty/SecurityHub ativos.

Deploy aplicacao
1) Build e push para ECR.
2) Rodar migracoes com `npm run db:migrate`.
3) Forcar novo deploy das services ECS.
4) Smoke tests (health, login, CRUD basico).

Secrets CI (GitHub Actions)
- AWS_ROLE_ARN (output `github_deploy_role_arn`)
- ECR_FRONTEND_URI / ECR_BACKEND_URI (outputs ECR)
- ECS_PRIVATE_SUBNETS (lista separada por virgula)
- ECS_SECURITY_GROUP (output `ecs_security_group_id`)

Cutover
1) Se houver dominio, apontar DNS para CloudFront/ALB.
2) Verificar HTTPS, WAF, headers, logs e alarms.
3) Monitorar 5xx/4xx por 30-60 min.

Rollback
1) Reverter task definition ou forcar deploy da tag anterior.
2) Se necessario, voltar DNS para ambiente antigo.
3) Validar logs e causa raiz.

Descomissionamento (apenas com comando explicito do usuario)
- Remover recursos antigos e chaves associadas.
- Revogar acessos e limpar segredos.
