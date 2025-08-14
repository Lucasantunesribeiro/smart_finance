# SmartFinance Project Structure

## Root Level Organization
```
SmartFinance/
├── backend/           # .NET 8 API (Clean Architecture)
├── frontend/          # Next.js 14 web application
├── microservice/      # Node.js payment processing service
├── docs/             # Architecture and API documentation
├── scripts/          # Build and deployment scripts
├── monitoring/       # Prometheus and Grafana configuration
├── nginx/            # Reverse proxy configuration
└── docker-compose.yml # Multi-service orchestration
```

## Backend Structure (.NET Clean Architecture)
```
backend/
├── src/
│   ├── SmartFinance.Domain/        # Core business entities and rules
│   ├── SmartFinance.Application/   # Use cases, commands, queries (CQRS)
│   ├── SmartFinance.Infrastructure/ # Data access, external services
│   └── SmartFinance.WebApi/        # Controllers, middleware, startup
├── tests/                          # Unit and integration tests
├── SmartFinance.sln               # Solution file
└── Dockerfile                     # Multi-stage container build
```

## Frontend Structure (Next.js App Router)
```
frontend/
├── src/
│   ├── app/           # App Router pages and layouts
│   ├── components/    # Reusable UI components (Shadcn/ui)
│   ├── lib/          # Utilities, API clients, configurations
│   ├── hooks/        # Custom React hooks
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
├── package.json      # Dependencies and scripts
└── next.config.js    # Next.js configuration
```

## Microservice Structure (Node.js)
```
microservice/
├── src/
│   ├── controllers/   # Express route handlers
│   ├── services/     # Business logic and external integrations
│   ├── models/       # MongoDB schemas and data models
│   ├── middleware/   # Authentication, validation, logging
│   ├── utils/        # Helper functions and utilities
│   ├── types/        # TypeScript interfaces
│   └── config/       # Environment and service configuration
├── logs/             # Application logs (development)
└── tsconfig.json     # TypeScript configuration with path mapping
```

## Configuration Files
- **Environment**: `.env.local` files in each service directory
- **Docker**: Individual `Dockerfile` per service + root `docker-compose.yml`
- **TypeScript**: Strict mode with path mapping (`@/*` aliases)
- **Linting**: ESLint configurations per service
- **Package Management**: `package.json` with lock files

## Naming Conventions
- **Files**: kebab-case for components, PascalCase for classes
- **Directories**: lowercase with hyphens
- **API Endpoints**: RESTful with versioning (`/api/v1/`)
- **Database**: PascalCase for entities, camelCase for properties
- **Environment Variables**: UPPER_SNAKE_CASE

## Key Patterns
- **Clean Architecture**: Domain-driven design with dependency inversion
- **CQRS**: Separate command and query handlers in Application layer
- **Repository Pattern**: Data access abstraction in Infrastructure
- **Microservices**: Loosely coupled services with async communication
- **Container-first**: All services designed for Docker deployment

## Development Workflow
1. **Local Development**: Use Docker Compose for full stack
2. **Service Development**: Individual service development with hot reload
3. **Database Migrations**: Entity Framework migrations for schema changes
4. **API Documentation**: Swagger/OpenAPI for backend endpoints
5. **Testing**: Unit tests in respective test directories