# SmartFinance Architecture Documentation

## System Overview

SmartFinance is built using a modern, scalable architecture that follows industry best practices for enterprise financial systems. The system is designed with security, performance, and maintainability as core principles.

## Architecture Patterns

### 1. Clean Architecture (Backend)
The .NET backend follows Clean Architecture principles:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│                    (WebApi Controllers)                     │
├─────────────────────────────────────────────────────────────┤
│                    Application Layer                        │
│              (Use Cases, Commands, Queries)                 │
├─────────────────────────────────────────────────────────────┤
│                      Domain Layer                           │
│                (Entities, Value Objects)                    │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│              (Data Access, External Services)               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Microservices Architecture
The system is composed of loosely coupled microservices:

- **Main API Service** (.NET) - Core business logic
- **Payment Service** (Node.js) - Payment processing and banking
- **Frontend Service** (Next.js) - User interface

### 3. CQRS Pattern
Command Query Responsibility Segregation separates read and write operations:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Command   │    │   Handler   │    │  Database   │
│  (Create,   │───▶│  (Business  │───▶│   (Write)   │
│   Update,   │    │   Logic)    │    │             │
│   Delete)   │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Query    │    │   Handler   │    │  Database   │
│   (Read     │───▶│  (Data      │───▶│   (Read)    │
│ Operations) │    │ Retrieval)  │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
```

## System Components

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Real-time**: SignalR client
- **Authentication**: JWT with refresh tokens

### Backend API (.NET)
- **Framework**: ASP.NET Core 8
- **Language**: C#
- **ORM**: Entity Framework Core
- **Database**: SQL Server
- **Authentication**: JWT Bearer
- **Real-time**: SignalR
- **Logging**: Serilog

### Payment Microservice (Node.js)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Queue**: Bull (Redis-based)
- **Cache**: Redis
- **Logging**: Winston

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: GitHub Actions

## Data Flow

### 1. User Authentication Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │  Backend    │    │  Database   │
│             │    │     API     │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        │  POST /auth/login │                   │
        │──────────────────▶│                   │
        │                   │  Validate User    │
        │                   │──────────────────▶│
        │                   │                   │
        │                   │  User Data        │
        │                   │◀──────────────────│
        │                   │                   │
        │  JWT + Refresh    │                   │
        │◀──────────────────│                   │
        │                   │                   │
```

### 2. Transaction Processing Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │  Backend    │    │  Payment    │    │  Database   │
│             │    │     API     │    │  Service    │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │                   │
        │ Create Transaction│                   │                   │
        │──────────────────▶│                   │                   │
        │                   │  Save Transaction │                   │
        │                   │──────────────────▶│                   │
        │                   │                   │                   │
        │                   │  Process Payment  │                   │
        │                   │──────────────────▶│                   │
        │                   │                   │  Update Status    │
        │                   │                   │──────────────────▶│
        │                   │                   │                   │
        │  SignalR Update   │                   │                   │
        │◀──────────────────│                   │                   │
        │                   │                   │                   │
```

## Database Design

### SQL Server (Main Database)
Primary database for core business entities:

```sql
-- Users Table
CREATE TABLE Users (
    Id uniqueidentifier PRIMARY KEY,
    Email nvarchar(255) UNIQUE NOT NULL,
    PasswordHash nvarchar(255) NOT NULL,
    FirstName nvarchar(100) NOT NULL,
    LastName nvarchar(100) NOT NULL,
    Role int NOT NULL,
    CreatedAt datetime2 NOT NULL,
    UpdatedAt datetime2 NOT NULL
);

-- Accounts Table
CREATE TABLE Accounts (
    Id uniqueidentifier PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    Name nvarchar(100) NOT NULL,
    Type int NOT NULL,
    Balance decimal(18,2) NOT NULL,
    Currency nvarchar(3) NOT NULL,
    CreatedAt datetime2 NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- Transactions Table
CREATE TABLE Transactions (
    Id uniqueidentifier PRIMARY KEY,
    UserId uniqueidentifier NOT NULL,
    AccountId uniqueidentifier NOT NULL,
    Amount decimal(18,2) NOT NULL,
    Description nvarchar(500) NOT NULL,
    Type int NOT NULL,
    Status int NOT NULL,
    TransactionDate datetime2 NOT NULL,
    CreatedAt datetime2 NOT NULL,
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (AccountId) REFERENCES Accounts(Id)
);
```

### MongoDB (Payment Service)
Document database for payment processing:

```javascript
// Payments Collection
{
  _id: ObjectId,
  userId: String,
  amount: Number,
  currency: String,
  description: String,
  paymentMethod: String,
  status: String,
  transactionId: String,
  createdAt: Date,
  updatedAt: Date,
  metadata: Object
}

// Bank Accounts Collection
{
  _id: ObjectId,
  userId: String,
  accountNumber: String,
  bankName: String,
  accountType: String,
  balance: Number,
  lastSyncAt: Date,
  metadata: Object
}
```

### Redis (Caching & Queues)
In-memory store for:
- Session management
- Queue processing (Bull)
- Caching frequently accessed data
- Rate limiting counters

## Security Architecture

### Authentication & Authorization
```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│  1. Network Security (HTTPS, CORS, Rate Limiting)          │
├─────────────────────────────────────────────────────────────┤
│  2. Authentication (JWT with Refresh Tokens)               │
├─────────────────────────────────────────────────────────────┤
│  3. Authorization (Role-based Access Control)              │
├─────────────────────────────────────────────────────────────┤
│  4. Data Protection (Input Validation, SQL Injection)      │
├─────────────────────────────────────────────────────────────┤
│  5. Audit & Monitoring (Logging, Alerts)                   │
└─────────────────────────────────────────────────────────────┘
```

### JWT Token Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Client   │    │   Backend   │    │    Redis    │
│             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        │  Access Token     │                   │
        │──────────────────▶│                   │
        │                   │  Validate Token   │
        │                   │──────────────────▶│
        │                   │                   │
        │  401 Unauthorized │                   │
        │◀──────────────────│                   │
        │                   │                   │
        │  Refresh Token    │                   │
        │──────────────────▶│                   │
        │                   │  New Access Token │
        │                   │──────────────────▶│
        │                   │                   │
        │  New Tokens       │                   │
        │◀──────────────────│                   │
        │                   │                   │
```

## Scalability Considerations

### Horizontal Scaling
- **Load Balancing**: Nginx reverse proxy
- **Database Sharding**: User-based partitioning
- **Microservices**: Independent scaling
- **CDN**: Static asset delivery

### Vertical Scaling
- **Database Optimization**: Indexes, query optimization
- **Caching Strategy**: Redis for hot data
- **Background Processing**: Async operations

### Performance Optimization
- **Connection Pooling**: Database connections
- **Pagination**: Large dataset handling
- **Compression**: Gzip/Brotli for responses
- **Caching**: Multiple cache layers

## Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
│                        (Nginx)                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend    │  Backend API   │  Payment Service           │
│  (Next.js)   │  (.NET Core)   │  (Node.js)                 │
├─────────────────────────────────────────────────────────────┤
│  SQL Server  │  MongoDB       │  Redis                     │
│  (Primary)   │  (Logs/Queue)  │  (Cache/Session)           │
├─────────────────────────────────────────────────────────────┤
│  Monitoring  │  Logging       │  Backup                    │
│  (Grafana)   │  (ELK Stack)   │  (Automated)               │
└─────────────────────────────────────────────────────────────┘
```

### Container Orchestration
- **Docker**: Application containerization
- **Kubernetes**: Production orchestration
- **Health Checks**: Container health monitoring
- **Auto-scaling**: Based on metrics

## Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Custom business metrics
- **System Metrics**: CPU, memory, disk usage
- **Database Metrics**: Query performance, connections
- **Network Metrics**: Request latency, throughput

### Logging Strategy
- **Structured Logging**: JSON format
- **Centralized Logging**: ELK Stack
- **Log Levels**: Debug, Info, Warning, Error
- **Correlation IDs**: Request tracing

### Alerting
- **Threshold Alerts**: Performance degradation
- **Error Rate Alerts**: High error rates
- **Business Alerts**: Fraud detection
- **Health Check Alerts**: Service availability

## Development Workflow

### Git Flow
```
main branch (production)
├── develop branch (integration)
│   ├── feature/user-authentication
│   ├── feature/payment-processing
│   └── feature/dashboard-improvements
├── release/v1.2.0 (release preparation)
└── hotfix/security-patch (emergency fixes)
```

### CI/CD Pipeline
1. **Code Commit**: Developer pushes code
2. **Build**: Compile and package applications
3. **Test**: Unit, integration, and e2e tests
4. **Security Scan**: Vulnerability assessment
5. **Deploy**: Staging and production deployment
6. **Monitor**: Health checks and alerts

## Best Practices

### Code Quality
- **SOLID Principles**: Object-oriented design
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **Code Reviews**: Peer review process

### Security
- **Least Privilege**: Minimum required permissions
- **Defense in Depth**: Multiple security layers
- **Regular Updates**: Dependency management
- **Security Testing**: Automated security scans

### Performance
- **Database Optimization**: Query optimization
- **Caching Strategy**: Multi-level caching
- **Async Processing**: Non-blocking operations
- **Resource Management**: Memory and CPU optimization

This architecture provides a robust foundation for a scalable, secure, and maintainable financial management system.