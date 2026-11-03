# SmartFinance

Aplicação de finanças pessoais: contas, transações, categorias, orçamentos e relatórios.
Frontend em Next.js 14 e API principal em .NET 8 com PostgreSQL. Há também um serviço Node.js
separado (`microservice/`) que não faz parte do `docker-compose.yml` padrão.

[![CI](https://github.com/Lucasantunesribeiro/smart_finance/actions/workflows/ci.yml/badge.svg)](https://github.com/Lucasantunesribeiro/smart_finance/actions/workflows/ci.yml)

## O que o código faz

- **Autenticação**: login com JWT em cookies HttpOnly (`sf_at`, `sf_rt`), refresh token e CSRF (`AuthController`, `CsrfValidationMiddleware`).
- **Contas**: CRUD e saldo consolidado por usuário.
- **Transações**: criar, editar, excluir (soft delete), filtrar e paginar. Cada operação atualiza o saldo da conta.
- **Categorias**: CRUD, hierarquia pai/filho e estatísticas (total e média por categoria).
- **Orçamentos**: valor alocado por período e categoria, gasto calculado a partir das despesas.
- **Analytics**: receitas/despesas por período, tendências, fluxo de caixa e resumo.
- **Eventos**: criação de transação grava um evento no outbox; um worker publica no RabbitMQ e um consumer repassa ao SignalR (`/financehub`). Ver [ADR 0003](docs/adr/0003-outbox-para-eventos-de-transacao.md).
- **Métricas**: Prometheus em `/metrics`; health check em `/health`.

### Dinheiro

- Backend: todo valor monetário é `decimal`, coluna `numeric(18,2)` (`decimal(18,2)` no EF Core).
  As regras ficam em `SmartFinance.Domain.Common.Money`. O arredondamento é sempre para centavos com
  `MidpointRounding.AwayFromZero`. Valores zero ou negativos em transações e orçamentos retornam 400.
  Ver [ADR 0001](docs/adr/0001-dinheiro-em-decimal-no-backend.md).
- Frontend e microservice: somas, diferenças e médias são feitas em centavos inteiros
  (`frontend/src/lib/money.ts`, `microservice/money.js`). A exibição usa `Intl.NumberFormat` pt-BR/BRL.
  Ver [ADR 0002](docs/adr/0002-centavos-inteiros-no-frontend-e-microservice.md).

## Arquitetura

```mermaid
flowchart LR
    U[Navegador] -->|HTTP| FE[frontend<br/>Next.js 14 :3000]
    FE -->|/api/v1 via BACKEND_URL| API[backend<br/>ASP.NET Core 8 :5000]
    U -.->|SignalR /financehub| API
    API -->|EF Core / Npgsql| PG[(PostgreSQL 15)]
    API -->|Outbox publisher| MQ[(RabbitMQ)]
    MQ -->|TransactionCreated consumer| API
    PROM[Prometheus<br/>perfil observability] -->|/metrics| API
    GRAF[Grafana] --> PROM

    subgraph backend
      direction TB
      WebApi --> Application --> Domain
      Infrastructure --> Application
      WebApi --> Infrastructure
    end
```

Camadas do backend (`backend/src`):

| Projeto | Responsabilidade |
|---|---|
| `SmartFinance.Domain` | Entidades, enums, regras de dinheiro (`Money`, `Account.ApplyTransaction`) |
| `SmartFinance.Application` | Commands/queries MediatR de transações e autenticação, DTOs |
| `SmartFinance.Infrastructure` | `DbContext`, migrations (PostgreSQL), repositórios, serviços de contas/categorias/orçamentos/analytics |
| `SmartFinance.WebApi` | Controllers, middlewares (CSRF, correlation id), SignalR, outbox/consumer RabbitMQ |

Sem `DATABASE_URL`, a API usa SQLite (`ConnectionStrings:DefaultConnection`) e `EnsureCreated`
em vez de migrations. Isso serve só para desenvolvimento local.

## Como rodar

### Pré-requisitos

- Docker com Docker Compose v2
- Para rodar fora do Docker: .NET 8 SDK e Node.js 20 (`.nvmrc`)

### Docker Compose

```bash
cp .env.example .env
# Troque todos os valores CHANGE_THIS... por segredos fortes
docker compose up -d --build
```

| Serviço | Endereço |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:5000/api/v1 |
| Health | http://localhost:5000/health |
| Métricas | http://localhost:5000/metrics |
| RabbitMQ (management) | http://localhost:15672 |

Observabilidade opcional (Prometheus em :9090, Grafana em :3002):

```bash
docker compose --profile observability up -d prometheus grafana
```

Com `DATABASE_URL` definido, a API aplica as migrations ao iniciar.

### Local, sem Docker

```bash
# Backend (usa SQLite se DATABASE_URL não estiver definido)
cd backend
dotnet run --project src/SmartFinance.WebApi
# Em Development o Swagger fica na raiz: http://localhost:5000

# Frontend
cd frontend
npm ci
npm run dev
```

Microservice Node (opcional, fora do compose; precisa de PostgreSQL próprio):

```bash
cd microservice
npm ci
npm run db:migrate
node server.js
```

## Variáveis de ambiente

Arquivo de exemplo: [`.env.example`](.env.example). Só placeholders; nunca commite um `.env` real.

| Variável | Usada por | Obrigatória | Descrição |
|---|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | compose (postgres, backend) | sim | Banco PostgreSQL; o compose monta o `DATABASE_URL` do backend |
| `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | compose (rabbitmq, backend) | sim | Credenciais do RabbitMQ |
| `JWT_SECRET_KEY` | backend | sim | Chave de assinatura do JWT |
| `JWT_ISSUER`, `JWT_AUDIENCE` | backend | não | Padrão `SmartFinance` / `SmartFinanceUsers` |
| `DATABASE_URL` | backend | não | `postgres://user:pass@host:5432/db`. Sem ela, SQLite |
| `DB_SSL` | backend | não | `true` para exigir SSL no PostgreSQL |
| `ALLOWED_ORIGINS` | backend | não | Origens CORS separadas por vírgula |
| `COOKIE_SECURE`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN` | backend | não | Atributos dos cookies de sessão |
| `ASPNETCORE_ENVIRONMENT` | backend | não | `Development` habilita Swagger |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | backend | não | Exportador OpenTelemetry |
| `Messaging__RabbitMq__*` | backend | não | Liga a mensageria e ajusta retry/polling (ver `docker-compose.yml`) |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SIGNALR_URL` | frontend (build) | não | Caminhos da API e do hub |
| `BACKEND_URL` | frontend | não | URL interna do backend para o proxy do Next |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | microservice | só para o microservice | Segredos do serviço Node |

## Como testar

```bash
# Backend: xUnit (domínio, handlers, serviços em SQLite/InMemory, JSON)
cd backend && dotnet test SmartFinance.sln

# Frontend: lint, tipos, Jest
cd frontend && npm ci && npm run lint && npm run type-check && npm test

# Microservice: Jest
cd microservice && npm ci && npm test
```

Os testes de dinheiro ficam em `backend/tests/SmartFinance.Tests/Financial/`,
`frontend/src/lib/money.test.ts` e `microservice/tests/money.test.ts`.

O CI (`.github/workflows/ci.yml`) roda esses mesmos passos em `pull_request` e `push` para `main`.
Os workflows de deploy (`deploy.yml`, `deploy-github-pages.yml`) não rodam em pull request.

## Estrutura

```
backend/         API .NET 8 (Domain, Application, Infrastructure, WebApi) e testes
frontend/        Next.js 14 (App Router), componentes do dashboard, serviços axios
microservice/    Serviço Node (server.js + PostgreSQL) e contexto TS de pagamentos (src/, MongoDB)
infrastructure/  Compose para EC2 e Terraform
nginx/           Configurações de reverse proxy
monitoring/      Prometheus e dashboards do Grafana
docs/adr/        Decisões de arquitetura
```

## Limitações conhecidas

- **Usuário de demonstração**: a migration inicial (`HasData`) cria `test@smartfinance.com` com hash de
  senha fixo no código, e `Program.cs` contém a senha de demonstração em texto. O usuário existe em
  qualquer banco migrado, inclusive produção.
- **Transferências** (`TransactionType.Transfer`) não alteram saldo; não há conta de destino.
- **Status da transação** não afeta o saldo: uma transação `Pending` já soma ou subtrai.
- **SQLite** (dev) não roda as migrations (usa `EnsureCreated`), e as somas de orçamento/categoria
  são feitas em memória.
- **Seed com `DateTime.UtcNow`** em `HasData`: `dotnet ef migrations add` sempre gera `UpdateData`
  dos registros de seed, mesmo sem mudança de modelo.
- **Microservice TypeScript** (`microservice/src`, pagamentos com MongoDB/Bull) não é iniciado pelo
  Dockerfile (`node server.js`) e ainda usa `number` puro em taxas e reembolsos.
- Não há FluentValidation registrado no backend; a validação é feita nos controllers e handlers.

## Licença

MIT
