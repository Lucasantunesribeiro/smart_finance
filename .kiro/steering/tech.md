# SmartFinance Technology Stack

## Architecture Pattern
- **Clean Architecture** with CQRS pattern for .NET backend
- **Microservices** architecture with loosely coupled services
- **Event-driven** communication using SignalR for real-time updates

## Tech Stack

### Backend (.NET 8)
- **Framework**: ASP.NET Core 8 with Clean Architecture
- **ORM**: Entity Framework Core
- **Database**: SQL Server (primary), MongoDB (payments/logs)
- **Authentication**: JWT Bearer with refresh tokens
- **Real-time**: SignalR for live updates
- **Logging**: Serilog with structured logging
- **Validation**: FluentValidation
- **Mapping**: AutoMapper
- **Mediator**: MediatR for CQRS

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router and TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui components
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for financial visualizations
- **Real-time**: SignalR client integration

### Payment Microservice (Node.js)
- **Runtime**: Node.js with Express.js and TypeScript
- **Database**: MongoDB for payment data
- **Queue**: Bull Queue with Redis for async processing
- **Cache**: Redis for sessions and rate limiting
- **Logging**: Winston with structured logging
- **Validation**: Joi for request validation

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose (development), Kubernetes (production)
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: GitHub Actions

## Development Commands

### Docker (Recommended for full stack)
```bash
# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down -v
```

### Backend (.NET)
```bash
cd backend
dotnet restore
dotnet build
dotnet run --project src/SmartFinance.WebApi
dotnet test  # Run tests
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npm run type-check  # TypeScript check
```

### Payment Service (Node.js)
```bash
cd microservice
npm install
npm run dev      # Development with hot reload
npm run build    # TypeScript compilation
npm run test     # Jest tests
npm run lint     # ESLint
```

## Code Quality Standards
- **TypeScript**: Strict mode enabled across all services
- **Linting**: ESLint with TypeScript rules
- **Testing**: Unit tests required for business logic
- **Security**: Input validation, SQL injection prevention, XSS protection
- **Performance**: Async/await patterns, connection pooling, caching strategies