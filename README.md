# SmartFinance

> Plataforma full-stack de gestão financeira pessoal com frontend Next.js e backend .NET 8 como trilha canônica de produção

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![.NET](https://img.shields.io/badge/.NET%208-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![AWS](https://img.shields.io/badge/AWS-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![CI](https://github.com/Lucasantunesribeiro/smart_finance/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Lucasantunesribeiro/smart_finance/actions/workflows/ci-cd.yml)

## Visão Geral

SmartFinance cobre o ciclo completo de um produto SaaS financeiro: autenticação segura, segregação de dados por usuário, contas, transações, categorias, orçamentos, analytics e mensageria assíncrona. O backend .NET 8 é a implementação principal do produto; o microserviço Node.js permanece como bounded context isolado para pagamentos e integrações especializadas.

| Camada | Tecnologia | Status |
|--------|-----------|--------|
| Frontend | Next.js 14, React 18, TypeScript, TailwindCSS, shadcn/ui | Produção |
| Backend principal | .NET 8, Clean Architecture, CQRS/MediatR, EF Core, RabbitMQ | Produção |
| Microserviço isolado | Node.js/TypeScript, Bull/Redis, MongoDB | Suporte a pagamentos |
| Infraestrutura | AWS EC2 + Docker Compose (atual) / ECS Fargate + RDS (Terraform) | Ambos |

## Funcionalidades

- **Autenticação** — JWT com refresh token rotation, cookies HttpOnly, CSRF protection
- **Contas** — CRUD com saldo consolidado por usuário
- **Transações** — criação, edição, filtros por período/categoria/conta, paginação
- **Categorias** — hierarquia pai/filho, isolamento por usuário, stats de uso
- **Orçamentos** — períodos configuráveis, alertas de utilização
- **Analytics** — income/expenses por período, tendências com variação %, cash flow, financial summary com savings rate e budget utilization
- **Multi-idioma** — pt-BR / en-US com toggle dinâmico

## Stack

### Frontend
- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **TailwindCSS**, **shadcn/ui** (Radix UI)
- **TanStack Query** (server state), **Axios**
- **Recharts** (gráficos), **date-fns**

### Backend principal (.NET 8)
- **Clean Architecture** (Domain → Application → Infrastructure → WebApi)
- **CQRS** com **MediatR** (Auth + Transactions end-to-end; Analytics com queries EF Core reais)
- **Entity Framework Core** (PostgreSQL prod / SQLite dev)
- **FluentValidation**, **Serilog**, **Swagger**, **SignalR**
- **RabbitMQ**, **Outbox Pattern**, idempotência no consumer e política de retry/DLQ

### Microserviço complementar (Node.js/TypeScript)
- Contexto isolado de pagamentos e banking
- **Bull + Redis**, **MongoDB**, **JWT**, **Winston**
- Mantido fora do fluxo principal do produto para preservar a arquitetura canônica em .NET

### Infraestrutura
- **Docker Compose** — postgres + rabbitmq + backend .NET + frontend
- **Nginx** — reverse proxy, rate limiting, security headers
- **Terraform** — trilha EC2 simples e trilha enterprise ECS/Fargate
- **AWS**: EC2, RDS, ECS Fargate, ALB, CloudFront, WAF, Secrets Manager, KMS, GuardDuty, Security Hub, CloudTrail

### CI/CD
- **GitHub Actions**: lint/type-check/build (frontend), syntax check (microservice), dotnet build/test (.NET), CodeQL (JS + C#), Trivy, Gitleaks

## Como Rodar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+ (dev local)
- .NET 8 SDK (backend principal)

### Docker (recomendado)
```bash
git clone https://github.com/Lucasantunesribeiro/smart_finance.git
cd smart_finance

cp .env.example .env
# Configure DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, JWT_SECRET_KEY

docker compose up -d

# Frontend: http://localhost:3000
# API:      http://localhost:5000/api/v1
# Docs:     http://localhost:5000/docs
# Metrics:  http://localhost:5000/metrics
```

### Observabilidade local
```bash
docker compose --env-file .env.example --profile observability up -d prometheus grafana

# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3002
```

**Credenciais de teste (seed):**
- Email: `test@smartfinance.com` / Senha: `SmartFinance123!`

### Frontend (dev local)
```bash
cd frontend && npm install && npm run dev
```

### Microservice Node.js (dev local)
```bash
cd microservice && npm install
npm run db:migrate   # roda migrations
npm run db:seed      # popula dados demo
npm run dev          # hot reload
```

### Backend .NET
```bash
cd backend
dotnet build SmartFinance.sln
dotnet run --project src/SmartFinance.WebApi
# Swagger: http://localhost:5000
```

## Estrutura

```
smartfinance/
├── frontend/                  # Next.js 14
│   └── src/
│       ├── app/               # App Router (/, /login, /dashboard)
│       ├── components/        # Dashboard, dialogs, analytics
│       ├── hooks/             # useAuth, useCategories, useSignalR
│       └── services/          # axios wrappers por domínio
├── microservice/              # Node.js/TypeScript para pagamentos isolados
│   ├── src/routes/            # rotas de pagamentos e banking
│   ├── src/services/          # filas, fraude e integração bancária
│   ├── src/models/            # documentos MongoDB
│   └── tests/                 # testes unitários e de rotas
├── backend/                   # .NET 8 principal
│   └── src/
│       ├── SmartFinance.Domain/
│       ├── SmartFinance.Application/
│       ├── SmartFinance.Infrastructure/
│       └── SmartFinance.WebApi/
├── infrastructure/
│   ├── aws-free-tier/         # EC2 + Docker Compose
│   └── terraform-enterprise/  # ECS Fargate + RDS + WAF
├── nginx/                     # configs de reverse proxy
└── docker-compose.yml
```

## Variáveis de Ambiente

```env
# Obrigatórias
POSTGRES_DB=smartfinance
POSTGRES_USER=smartfinance
POSTGRES_PASSWORD=mínimo-16-caracteres
RABBITMQ_USER=smartfinance
RABBITMQ_PASSWORD=mínimo-16-caracteres
JWT_ACCESS_SECRET=mínimo-32-caracteres
JWT_REFRESH_SECRET=mínimo-32-caracteres
JWT_SECRET_KEY=mínimo-32-caracteres

# Opcionais
ALLOWED_ORIGINS=http://localhost:3000
AUTO_MIGRATE=true
SEED_DEMO_DATA=true
NEXT_PUBLIC_API_URL=/api/v1
```

Ver `.env.example` para configuração completa.

## Deploy

### AWS EC2 (atual)
```bash
scp -r . ubuntu@<ip>:/opt/smartfinance
ssh ubuntu@<ip> "cd /opt/smartfinance && docker compose up -d --build"
```

### Terraform Enterprise
```bash
cd infrastructure/terraform-enterprise
terraform init && terraform plan && terraform apply
```

## Segurança

- JWT access tokens (15min) + refresh tokens (7d) com rotation
- Cookies HttpOnly (`sf_at`, `sf_rt`) + CSRF token obrigatório em mutações
- Rate limiting por IP e por usuário autenticado
- Input validation com Joi (Node.js) e FluentValidation (.NET)
- SQL parametrizado em todas as queries (sem ORM raw strings)
- CSP headers, CORS configurado, `server_tokens off` no Nginx
- Sem endpoints de debug ou logging de credenciais no código

## Performance

| Métrica | Valor |
|---------|-------|
| Memory (microservice) | ~87 MB / 1 GB |
| Response time (p95) | < 200 ms |
| Cost/month (EC2 Free Tier) | $0 |

## Licença

MIT © 2026
