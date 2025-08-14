# Design Document - Fix Build and Deployment Issues

## Overview

This design document outlines the approach to resolve the build and deployment issues in the SmartFinance application. The solution addresses TypeScript compilation errors in the frontend, Docker port conflicts, Docker Desktop connectivity issues, and ensures proper service integration.

## Architecture

The SmartFinance application follows a microservices architecture with three main components:

1. **Frontend** (Next.js 14 with TypeScript)
2. **Backend API** (.NET 8 with Clean Architecture)
3. **Payment Microservice** (Node.js with Express)

These services are containerized using Docker and orchestrated with Docker Compose. The current issues are preventing proper deployment and need to be resolved while maintaining the existing architecture.

## Components and Interfaces

### Frontend TypeScript Fix

The frontend TypeScript error occurs in `ReportsPage.tsx` when calling the `getTransactions` method without providing all required properties defined in the `TransactionFilter` interface:

```typescript
// Current problematic code
const transactions = await transactionService.getTransactions({
  fromDate: dateRange.fromDate,
  toDate: dateRange.toDate,
  page: 1,
  pageSize: number
});
```

The `TransactionFilter` interface requires `sortBy` and `sortOrder` properties:

```typescript
interface TransactionFilter {
  fromDate?: string;
  toDate?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  accountId?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: string;    // Required but missing
  sortOrder: string; // Required but missing
}
```

The fix will involve updating all calls to `getTransactions` to include these required properties.

### Docker Port Configuration

The Redis service is encountering port conflicts because port 6379 is already in use on the host machine. The solution involves modifying the `docker-compose.yml` file to use an alternative port mapping:

```yaml
# Current configuration
redis:
  ports:
    - "6379:6379"

# Updated configuration
redis:
  ports:
    - "6380:6379"  # Map container's 6379 to host's 6380
```

This change will require updating any service configurations that reference Redis by port.

### Docker Desktop Connectivity

The error `open //./pipe/dockerDesktopLinuxEngine: O sistema não pode encontrar o arquivo especificado` indicates that Docker Desktop is not running or is experiencing connectivity issues. The solution involves:

1. Ensuring Docker Desktop is properly installed and running
2. Verifying Docker Desktop service status
3. Providing troubleshooting steps for Docker Desktop connectivity issues

### Service Integration

To ensure all services integrate properly after fixing the build and deployment issues:

1. Update environment variables in each service to reflect any port changes
2. Verify connection strings and service discovery mechanisms
3. Implement health checks to validate service connectivity

## Data Models

No changes to the existing data models are required for these fixes.

## Error Handling

### Frontend Build Errors

The TypeScript compiler will catch type errors during the build process. The solution will:

1. Fix all TypeScript errors to ensure successful builds
2. Add appropriate error handling for API calls
3. Implement proper type checking for all service calls

### Docker Deployment Errors

For Docker-related errors, the solution will:

1. Provide clear error messages for port conflicts
2. Add health check endpoints to all services
3. Implement graceful failure handling for service dependencies
4. Document common Docker issues and their resolutions

## Testing Strategy

### Frontend Testing

1. **Unit Tests**: Verify that the `TransactionFilter` interface is properly implemented
2. **Build Tests**: Ensure the frontend builds without TypeScript errors
3. **Integration Tests**: Validate that the frontend correctly communicates with the backend API

### Docker Testing

1. **Container Tests**: Verify all containers start without port conflicts
2. **Service Tests**: Ensure all services can communicate with each other
3. **End-to-End Tests**: Validate the full application stack functions correctly

### Deployment Testing

1. **Local Deployment**: Test the full stack deployment on a developer machine
2. **Environment Variables**: Verify all services use the correct environment variables
3. **Health Checks**: Validate all service health checks return successful responses

## Implementation Considerations

### Frontend Changes

1. Update all calls to `getTransactions` to include required properties
2. Ensure consistent use of TypeScript interfaces across the application
3. Add proper error handling for API calls

### Docker Configuration Changes

1. Modify port mappings in `docker-compose.yml` to avoid conflicts
2. Update environment variables to reflect new port configurations
3. Add health check configurations to Docker Compose services

### Documentation Updates

1. Update README.md with troubleshooting steps for common issues
2. Document port configurations and service dependencies
3. Provide clear instructions for starting and stopping the application

## Deployment Strategy

1. Fix TypeScript errors in the frontend code
2. Update Docker Compose configuration to avoid port conflicts
3. Ensure Docker Desktop is running properly
4. Deploy the updated application using Docker Compose
5. Verify all services are running and communicating correctly

This approach ensures that the application can be built and deployed successfully while maintaining the existing architecture and functionality.