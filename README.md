# SmartFinance

Aplicação full-stack multi-idioma (pt-BR / en-US) rodando no ALB público `smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com`. O Next.js serve o dashboard e o Node.js + microserviço cuidam da API (JWT com access + refresh, CSRF, rate limiting e validação). Toda a infraestrutura (ECR, ECS, VPC, RDS, WAF, CloudFront, Secrets Manager) está codificada em `infrastructure/terraform-enterprise`.

## Deploy público
- Frontend: `http://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/`
- API: `https://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/api/v1`
- Health: `https://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/health`

## Como rodar localmente
1. `docker compose build` e `docker compose up`
2. Acesse:
   - Dashboard: `http://localhost:3000`
   - API: `http://localhost:5000/api/v1`
   - Documentação: `http://localhost:5000/docs`
3. Microserviço isolado: `cd microservice && npm install && npm run dev`

## Variáveis essenciais
Copie `.env.example` e defina `JWT_SECRET_KEY`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ALLOWED_ORIGINS` (URL do ALB) e credenciais PostgreSQL/Redis. O pipeline injeta automaticamente os valores sensíveis em Secrets Manager e IAM.

## Testes rápidos
- Frontend: `npm run lint`, `npm run type-check`, `npm run build`
- Microservice: `npm run lint`, `npm test`

## Estrutura mais relevante
- `frontend/`: Next.js + i18n toggle pt-br ↔ en + componentes shadcn/ui
- `microservice/`: API Node.js com validação, rate limit e migrations PostgreSQL
- `infrastructure/terraform-enterprise/`: Terraform para ALB/ECS/RDS/WAF/Secrets
- `docs/`: runbooks operacionais e validações de segurança

## Status atual
- ✅ Produção online com ALB/ECS/CloudFront
- ✅ Internacionalização ativa com toggle pt-br ↔ en
- ✅ Monitoramento via CloudWatch e alertas WAF

## Próximos passos
1. Garantir que Secrets Managers mantenham JWT/DB/S3 atualizados
2. Validar budgets/transactions diretamente em `/api/v1`
3. Testar trocas de idioma e relatórios em produção após o próximo deploy
