# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

SmartFinance is a full-stack financial management platform with three distinct layers:

```
Internet → Nginx :80 → Frontend (Next.js) :3000
                     → Microservice (Node.js) :5000 → PostgreSQL :5432
```

**Three backend implementations coexist:**

1. **`microservice/`** — The **active production API** (Node.js, plain HTTP, no framework). Uses a custom `SmartRouter` (`router.js`) for routing, PostgreSQL via `pg` pool (`store.js`), and JWT auth with cookie + CSRF support. All business logic is in `handlers.js` and `handlers-extended.js`. Server data (store, auth helpers, config) is injected at startup via `injectServerData()`.

2. **`backend/`** — .NET 8 Clean Architecture (experimental/enterprise). C#, CQRS with MediatR, EF Core with SQLite (dev) or PostgreSQL (prod). Serves on port 5000 — conflicts with the microservice if both run simultaneously.

3. **`frontend/`** — Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, React Query, SignalR. Proxies all `/api/*` requests to the backend via `next.config.js` rewrites (`BACKEND_URL`, defaults to `http://localhost:5000`).

## Development Commands

### Full Stack (Docker)
```bash
cp .env.example .env          # configure secrets
docker compose up -d          # start postgres + microservice + frontend
docker compose up -d --build  # rebuild images
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # dev server on :3000
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

### Node.js Microservice
```bash
cd microservice
npm install
npm run dev          # ts-node-dev with hot reload
npm test             # jest
npm run db:migrate   # run DB migrations
npm run db:seed      # seed demo data
node server.js       # run production server directly
```

### .NET Backend
```bash
cd backend
dotnet build SmartFinance.sln
dotnet run --project src/SmartFinance.WebApi
dotnet test tests/SmartFinance.Tests/SmartFinance.Tests.csproj --verbosity normal
# Run single test:
dotnet test --filter "FullyQualifiedName~TestName"
```

## Key Configuration

**Environment variables** (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string (required in prod; microservice falls back to in-memory if absent in dev)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `JWT_SECRET_KEY` — must be ≥32 chars in production
- `ALLOWED_ORIGINS` — comma-separated list for CORS
- `AUTO_MIGRATE=true` / `SEED_DEMO_DATA=true` — microservice runs migrations/seed on startup
- `NEXT_PUBLIC_API_URL` — frontend API base (e.g. `/api/v1` in prod, `http://localhost:5000/api/v1` in dev)
- `BACKEND_URL` — Next.js server-side proxy target (defaults to `http://localhost:5000`)

**Next.js** rewrites `/api/*` to `BACKEND_URL/api/*`. In development the frontend talks to the microservice; in production (AWS), traffic flows through Nginx and ALB.

## Microservice Internals

The microservice (`microservice/server.js`) is a raw Node.js HTTP server:
- **No Express** — all routing via custom `SmartRouter` class
- **Auth flow**: cookies (`sf_at`, `sf_rt`) + Bearer header; CSRF token required for non-GET mutations when using cookies
- **Store** (`store.js`): wraps `pg.Pool`, resolves UUIDs to internal integer IDs
- **Data access**: all SQL is in `store.js`; handlers receive the store via dependency injection (`injectServerData`)
- **Migrations**: `db/migrate.js` runs SQL files in `db/migrations/` sequentially
- Public routes (no auth): `/health`, `/api/v1/simpleauth/login`, `/api/v1/simpleauth/refresh`

## .NET Backend Structure

Clean Architecture layers:
- `SmartFinance.Domain` — entities (`User`, `Account`, `Transaction`, `Category`, `Budget`, `Report`), interfaces
- `SmartFinance.Application` — CQRS handlers (MediatR), validators (FluentValidation), features: `Auth/`, `Transactions/`
- `SmartFinance.Infrastructure` — EF Core `SmartFinanceDbContext`, repositories, `PasswordHasher`, `JwtTokenService`
- `SmartFinance.WebApi` — ASP.NET controllers, SignalR hub (`/financehub`), middleware, Swagger UI at root

SQLite is used for local dev (no `DATABASE_URL` set); PostgreSQL via `DATABASE_URL` env var in production.

## Frontend Structure

- `src/app/` — Next.js App Router pages (`/`, `/login`, `/dashboard`)
- `src/components/dashboard/` — main dashboard UI, `AddTransactionDialog`, `DashboardLayout`, analytics/settings pages
- `src/hooks/` — `useAuth` (AuthContext), `useCategories`, `useSignalR`
- `src/services/` — `authService`, `transactionService` (axios wrappers)
- `src/i18n/` — pt-BR/en-US translations with dynamic locale toggle
- `src/types/` — TypeScript interfaces

Auth tokens (`accessToken`, `refreshToken`) are stored in `localStorage`. The `AuthProvider` in `useAuth.tsx` wraps the app and initializes session from `localStorage` on mount.

## Infrastructure

- **Production (current)**: AWS EC2 Free Tier, Nginx reverse proxy, Docker Compose
- **Enterprise (Terraform)**: `infrastructure/terraform-enterprise/` — CloudFront → ALB → ECS Fargate → RDS, with WAF
- **CI/CD**: GitHub Actions workflows in `.github/workflows/`
- **Nginx configs**: `nginx/nginx.production.conf` (prod), `nginx/nginx.local.conf` (local dev)

## Dual-Backend Gotcha

The microservice and the .NET backend both default to port 5000. Only run one at a time locally unless you change the port. Docker Compose (`docker-compose.yml`) runs only the microservice on 5000; the .NET backend is not included in the compose file.
