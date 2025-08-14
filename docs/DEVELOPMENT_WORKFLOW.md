# Development Workflow

This document outlines the development workflow for the SmartFinance project, including how to make changes, test them locally, and debug issues.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

## Development Environment Setup

### Prerequisites

- Docker Desktop
- Node.js 18+
- .NET 8 SDK
- Visual Studio Code or Visual Studio 2022
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/smartfinance.git
   cd smartfinance
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   cd frontend
   npm install
   cd ..

   # Microservice dependencies
   cd microservice
   npm install
   cd ..

   # Backend dependencies
   cd backend
   dotnet restore
   cd ..
   ```

3. **Generate package-lock.json files (if needed)**
   ```bash
   # Windows
   .\scripts\generate-package-lock.bat

   # Linux/Mac
   ./scripts/generate-package-lock.sh
   ```

4. **Start the application with Docker**
   ```bash
   docker-compose up -d
   ```

## Development Workflow

### Making Changes

#### Frontend Changes

1. **Start the frontend in development mode**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Make changes to the frontend code**
   - Edit files in the `frontend/src` directory
   - Changes will be automatically reloaded in the browser

3. **Check for TypeScript errors**
   ```bash
   npm run type-check
   ```

4. **Lint the code**
   ```bash
   npm run lint
   ```

5. **Build the frontend for production**
   ```bash
   npm run build
   ```

#### Backend Changes

1. **Start the backend in development mode**
   ```bash
   cd backend
   dotnet run --project src/SmartFinance.WebApi
   ```

2. **Make changes to the backend code**
   - Edit files in the `backend/src` directory
   - Use Visual Studio or Visual Studio Code for better development experience

3. **Build the backend**
   ```bash
   dotnet build
   ```

4. **Run tests**
   ```bash
   dotnet test
   ```

#### Microservice Changes

1. **Start the microservice in development mode**
   ```bash
   cd microservice
   npm run dev
   ```

2. **Make changes to the microservice code**
   - Edit files in the `microservice/src` directory
   - Changes will be automatically reloaded

3. **Check for TypeScript errors**
   ```bash
   npm run type-check
   ```

4. **Lint the code**
   ```bash
   npm run lint
   ```

5. **Build the microservice for production**
   ```bash
   npm run build
   ```

### Docker Workflow

#### Rebuilding Services

After making changes to a service, you need to rebuild the Docker image and restart the service:

```bash
# Rebuild and restart a specific service
docker-compose build [service-name]
docker-compose up -d [service-name]

# Examples:
docker-compose build frontend
docker-compose up -d frontend

docker-compose build backend
docker-compose up -d backend

docker-compose build payment-service
docker-compose up -d payment-service
```

#### Viewing Logs

```bash
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f [service-name]

# Examples:
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f payment-service
```

#### Restarting Services

```bash
# Restart a specific service
docker-compose restart [service-name]

# Examples:
docker-compose restart frontend
docker-compose restart backend
docker-compose restart payment-service
```

#### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop all services and remove volumes
docker-compose down -v
```

## Testing

### Frontend Tests

```bash
cd frontend
npm test
```

### Backend Tests

```bash
cd backend
dotnet test
```

### Microservice Tests

```bash
cd microservice
npm test
```

### Integration Tests

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Manual Testing

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/swagger
   - Payment Service: http://localhost:3001/health
   - Grafana: http://localhost:3002 (admin/SmartFinance123!)

3. **Test service communication**
   ```bash
   .\scripts\test-service-communication.ps1
   ```

## Debugging

### Frontend Debugging

1. **Start the frontend in development mode**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open the browser developer tools**
   - Press F12 or right-click and select "Inspect"
   - Go to the "Console" tab to see errors and logs
   - Go to the "Network" tab to see API requests
   - Go to the "Sources" tab to set breakpoints

### Backend Debugging

1. **Start the backend in debug mode**
   ```bash
   cd backend
   dotnet run --project src/SmartFinance.WebApi --launch-profile Development
   ```

2. **Attach a debugger**
   - In Visual Studio: Debug > Attach to Process > Select the SmartFinance.WebApi process
   - In Visual Studio Code: Use the .NET Core Attach launch configuration

3. **Set breakpoints**
   - In Visual Studio: Click in the left margin of the code editor
   - In Visual Studio Code: Click in the left margin of the code editor

### Microservice Debugging

1. **Start the microservice in debug mode**
   ```bash
   cd microservice
   npm run debug
   ```

2. **Attach a debugger**
   - In Visual Studio Code: Use the Node.js Attach launch configuration
   - In Chrome: Open chrome://inspect and click "Open dedicated DevTools for Node"

3. **Set breakpoints**
   - In Visual Studio Code: Click in the left margin of the code editor
   - In Chrome DevTools: Go to the "Sources" tab and set breakpoints

### Docker Debugging

1. **View container logs**
   ```bash
   docker-compose logs -f [service-name]
   ```

2. **Execute commands inside a container**
   ```bash
   docker exec -it [container-name] [command]

   # Examples:
   docker exec -it smartfinance-backend sh
   docker exec -it smartfinance-frontend sh
   docker exec -it smartfinance-payment-service sh
   ```

3. **Inspect container details**
   ```bash
   docker inspect [container-name]
   ```

## Common Issues

### Frontend Issues

#### TypeScript Errors

**Symptoms:**
- Build fails with TypeScript errors
- Error messages about missing properties or incompatible types

**Solutions:**
1. Check the error message to identify the issue
2. Fix the TypeScript errors in the code
3. Run `npm run type-check` to verify the fix

#### API Connection Issues

**Symptoms:**
- Frontend can't connect to the backend API
- Error messages about CORS or network errors

**Solutions:**
1. Check if the backend API is running
2. Verify the API URL in the frontend environment variables
3. Check CORS configuration in the backend API
4. Check network connectivity between frontend and backend

### Backend Issues

#### Database Connection Issues

**Symptoms:**
- Backend fails to start or crashes
- Error messages about database connection

**Solutions:**
1. Check if the database is running
2. Verify the connection string in the backend environment variables
3. Check database credentials
4. Check network connectivity between backend and database

#### SignalR Issues

**Symptoms:**
- Real-time updates don't work
- Error messages about SignalR connection

**Solutions:**
1. Check if SignalR is configured correctly
2. Verify the SignalR URL in the frontend environment variables
3. Check CORS configuration for SignalR
4. Check network connectivity between frontend and SignalR

### Microservice Issues

#### Queue Processing Issues

**Symptoms:**
- Payments are not processed
- Error messages about queue processing

**Solutions:**
1. Check if Redis is running
2. Verify the Redis connection string in the microservice environment variables
3. Check Redis credentials
4. Check network connectivity between microservice and Redis

#### MongoDB Issues

**Symptoms:**
- Microservice fails to start or crashes
- Error messages about MongoDB connection

**Solutions:**
1. Check if MongoDB is running
2. Verify the MongoDB connection string in the microservice environment variables
3. Check MongoDB credentials
4. Check network connectivity between microservice and MongoDB

### Docker Issues

#### Container Startup Issues

**Symptoms:**
- Containers fail to start
- Error messages about container startup

**Solutions:**
1. Check container logs: `docker-compose logs -f [service-name]`
2. Check container status: `docker-compose ps`
3. Check container details: `docker inspect [container-name]`
4. Rebuild the container: `docker-compose build [service-name]`

#### Volume Issues

**Symptoms:**
- Data is not persisted between container restarts
- Error messages about volume mounting

**Solutions:**
1. Check volume configuration in `docker-compose.yml`
2. Check volume permissions
3. Check volume paths
4. Check volume status: `docker volume ls`

For more detailed troubleshooting steps, refer to the [Troubleshooting Guide](../README.md#-troubleshooting) in the README.md file.