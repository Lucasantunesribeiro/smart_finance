# Health Check Endpoints Implementation

## Overview

This document outlines the implementation of health check endpoints for all services in the SmartFinance application. Health checks are essential for monitoring service availability and ensuring proper integration between services.

## Current Status

- **Payment Service**: Already has a health check endpoint at `/health`
- **Backend API**: Needs a health check endpoint
- **Frontend**: Docker Compose is configured to check the root URL

## Implementation Plan

### 1. Backend API Health Check

Create a health check endpoint in the .NET backend API:

```csharp
// File: backend/src/SmartFinance.WebApi/Controllers/HealthController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System;
using System.Threading.Tasks;

namespace SmartFinance.WebApi.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly HealthCheckService _healthCheckService;

        public HealthController(HealthCheckService healthCheckService)
        {
            _healthCheckService = healthCheckService;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var report = await _healthCheckService.CheckHealthAsync();
            
            return Ok(new
            {
                status = report.Status.ToString(),
                checks = report.Entries.Select(e => new
                {
                    name = e.Key,
                    status = e.Value.Status.ToString(),
                    description = e.Value.Description,
                    duration = e.Value.Duration
                }),
                totalDuration = report.TotalDuration,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
```

Register health checks in the backend API:

```csharp
// File: backend/src/SmartFinance.WebApi/Program.cs

// Add this to the service configuration
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), name: "sqlserver")
    .AddRedis(builder.Configuration.GetConnectionString("RedisConnection"), name: "redis")
    .AddMongoDb(builder.Configuration.GetConnectionString("MongoConnection"), name: "mongodb");

// Add this to the app configuration
app.MapHealthChecks("/health");
```

### 2. Frontend Health Check

The frontend already has a health check configured in Docker Compose:

```yaml
frontend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### 3. Nginx Health Check

Create a health check endpoint in Nginx:

```nginx
# File: nginx/nginx.conf

# Add this inside the server block
location /health {
    access_log off;
    add_header Content-Type application/json;
    return 200 '{"status":"healthy","timestamp":"$time_iso8601"}';
}
```

### 4. Update Docker Compose Health Checks

The Docker Compose file already has health checks configured for all services:

```yaml
# SQL Server
healthcheck:
  test: ["CMD-SHELL", "/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P SmartFinance123! -C -Q 'SELECT 1'"]
  interval: 30s
  timeout: 10s
  retries: 3

# MongoDB
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 30s
  timeout: 10s
  retries: 3

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 30s
  timeout: 10s
  retries: 3

# Backend API
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# Payment Service
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3

# Frontend
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/"]
  interval: 30s
  timeout: 10s
  retries: 3

# Nginx
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Implementation Steps

1. Create the `HealthController.cs` file in the backend API
2. Update the `Program.cs` file to register health checks
3. Update the Nginx configuration to add a health check endpoint
4. Verify that all health checks are working correctly

## Testing Health Checks

After implementing the health checks, test them using the following commands:

```bash
# Backend API
curl http://localhost:5000/health

# Payment Service
curl http://localhost:3001/health

# Frontend
curl http://localhost:3000/

# Nginx
curl http://localhost/health
```

All health checks should return a 200 OK response with a JSON payload indicating the service status.