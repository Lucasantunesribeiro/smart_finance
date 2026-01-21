# 🚀 SmartFinance — Plataforma de Gestão Financeira Empresarial

SmartFinance é uma aplicação full-stack pronta para produção com foco em segurança, observabilidade e experiência do usuário. O stack combina **Front-end Next.js**, **Back-end Node.js**, **Microservice de pagamentos**, bancos PostgreSQL/Redis e infraestrutura codificada em **Terraform** para execução na AWS.

## 🌐 Deploy ativo
- **Frontend público:** http://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/
- **API (internal):** https://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/api/v1
- **Health check:** https://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/health

## 🔒 Arquitetura e segurança
1. **Frontend Next.js 14** com internacionalização pt-br/en e toggle global para alternar idiomas.
2. **Back-end Node.js (API principal)** rodando em Express + PM2, com JWT (access+refresh), rate limiting e CORS restrito ao domínio acima.
3. **Microservice de pagamentos** (Node.js + PostgreSQL + Redis) isolado para evitar regressões do backend .NET antigo.
4. **Infraestrutura Terraform + ECS + ALB + CloudFront + RDS + Secrets Manager** gerenciando container registry, IAM, Vault, WAF e monitoramento.
5. **Logs e observabilidade** por padrão com CloudWatch, Alertas do WAF e dashboard de métricas.

## ✅ Funcionalidades principais
- Autenticação e refresh tokens seguros.
- Dashboard financeiro em tempo real com gráficos.
- Administração completa de contas, categorias, orçamentos e transações.
- APIs REST e WebSocket (SignalR compatível) protegidas por tokens.
- Formulários validados com mensagens claras e gerenciamento de erros estruturados.
- Deploy com PM2, Nginx e monitoramento ativo (uptime, latência, custo).

## 🧭 Como rodar localmente (sem .NET legado)
1. `docker compose build`
2. `docker compose up`
3. Acesse:
   - Frontend: http://localhost:3000
   - API /docs: http://localhost:5000/docs
   - Health backend: http://localhost:5000/health
4. Para rodar microsserviço separado: `cd microservice && npm install && npm run dev`.

O ambiente usa apenas **Next.js**, **Node.js** e **PostgreSQL** para evitar duplicidade de backends. As migrações estão em `microservice/db/migrations`.

## ⚙️ Variáveis de ambiente essenciais
Copie `.env.example` e preencha valores sensíveis (JWT_SECRET_KEY, JWT_ACCESS_SECRET etc). O pipeline já injeta valores seguros para `ALLOWED_ORIGINS`, cookies e rate limits.

## 📦 Docker e deploy
- `docker compose up` — sobe frontend, backend e microserviço.
- `docker compose down` — interrrupe os serviços limpos.
- Jenkins/CI: o trabalho `frontend` na Action roda lint, type-check e build; `backend` executa apenas checagem `node --check`.

## 🧪 Testes e qualidade
- Frontend: `npm run lint`, `npm run type-check`, `npm run build`.
- Microservice: `npm run lint`, `npm test`.
- CodeQL e Trivy garantem compliance.

## 📜 Conteúdo adicional
- `docs/` — planos executivos, verificações de segurança e runbooks.
- `infrastructure/terraform-enterprise` — provisionamento AWS.
- `microservice/` — serviço Node.js com rate limiting, validação e logs.

## ✨ Status atual
- ✅ Produção online (ALB + ECS + CloudFront).
- ✅ Internacionalização com toggle pt-br ↔ en.
- ✅ Segurança OWASP alinhada (JWT, env vars, rate limit, CORS).
- ✅ Monitoramento e alertas em CloudWatch/WAF.

## 🔁 Próximos passos
1. Confirmar secrets no Secrets Manager (JWT, DB, S3).
2. Atualizar pipeline com deploy automatizado (Terraform + ECR + ECS).
3. Validar transações e budgets via rotas `/api/v1/transactions` e `/api/v1/budgets`.

## 👤 Contatos & suporte
- **Autor:** Lucas Antunes Ribeiro — lucas@smartfinance.com
- **GitHub:** https://github.com/lucasantunesribeiro
- **LinkedIn:** https://linkedin.com/in/lucasantunesribeiro
