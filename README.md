# SmartFinance

Aplicação full-stack multi-idioma (pt-BR / en-US) hospedada via ALB privado; a URL pública é definida em `ALLOWED_ORIGINS`/`ALB_HOSTNAME` e pode apontar para seu domínio customizado. O Next.js serve o dashboard e o Node.js + microserviço controlam a API (JWT com access + refresh, CSRF, rate limiting e validação). Toda a infraestrutura (ECR, ECS, VPC, RDS, WAF, CloudFront, Secrets Manager) está codificada em `infrastructure/terraform-enterprise`.

## Deploy público (configurável)
- Frontend: `https://<YOUR_ALB_HOSTNAME>/`
- API: `https://<YOUR_ALB_HOSTNAME>/api/v1`
- Health: `https://<YOUR_ALB_HOSTNAME>/health`

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

