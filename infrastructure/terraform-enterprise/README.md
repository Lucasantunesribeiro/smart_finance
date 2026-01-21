# Terraform - SmartFinance Enterprise

Este diretório provisiona a arquitetura alvo (ECS Fargate + ALB + RDS + WAF + CloudWatch + SecurityHub/GuardDuty/Config/CloudTrail).

## Pre-reqs
- Terraform >= 1.5
- AWS CLI configurado para a nova conta
- Domínio e ACM (opcional). Sem domínio, use o domain do CloudFront.

## Variáveis
1. Copie `terraform.tfvars.example` para `terraform.tfvars`.
2. Ajuste `github_repo` para o repositório correto.
3. Se tiver domínio, preencha `acm_certificate_arn` e configure DNS.

## Deploy
```bash
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

## Build e push das imagens
```bash
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.sa-east-1.amazonaws.com

docker build -t smartfinance-frontend:latest ./frontend

docker build -t smartfinance-backend:latest ./microservice

docker tag smartfinance-frontend:latest <ECR_FRONTEND>

docker tag smartfinance-backend:latest <ECR_BACKEND>

docker push <ECR_FRONTEND>

docker push <ECR_BACKEND>
```

## Migrações
Depois do deploy das tasks, execute:
```bash
cd microservice
npm run db:migrate
npm run db:seed
```

## URLs
- ALB DNS: output `alb_dns_name`
- CloudFront (HTTPS): output `cloudfront_domain`

## Notas importantes
- Para TLS com domínio próprio, configure ACM e atualize `acm_certificate_arn`.
- Use remote state (S3 + DynamoDB) em produção.
- Ajuste `enable_cloudfront` para false se preferir ALB direto.
