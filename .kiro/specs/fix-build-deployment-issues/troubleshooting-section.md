# Troubleshooting Guide

## Common Issues and Solutions

### Docker Desktop Issues

#### Docker Desktop Not Running

**Symptoms:**
- Error: `error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...": open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
- Commands like `docker-compose` fail with connection errors

**Solutions:**
1. Start Docker Desktop from the Start menu or system tray
2. Run the troubleshooting script:
   ```powershell
   .\scripts\docker-desktop-troubleshoot.ps1
   ```
3. If Docker Desktop won't start, try restarting your computer

#### Port Conflicts

**Symptoms:**
- Error: `Bind for 0.0.0.0:6379 failed: port is already allocated`
- Services fail to start due to port conflicts

**Solutions:**
1. Identify which service is using the conflicting port:
   ```powershell
   netstat -ano | findstr :6379
   ```
2. Stop the service using the conflicting port or modify `docker-compose.yml` to use a different port
3. For Redis specifically, we've already updated the port to 6380 in `docker-compose.yml`

### Service-Specific Issues

#### Backend API Issues

**Symptoms:**
- Backend container starts but health check fails
- Frontend can't connect to backend API

**Solutions:**
1. Check backend logs:
   ```powershell
   docker-compose logs backend
   ```
2. Verify database connection:
   ```powershell
   docker exec smartfinance-backend curl -s http://localhost:5000/health
   ```
3. Restart the backend service:
   ```powershell
   docker-compose restart backend
   ```

#### Frontend Build Issues

**Symptoms:**
- TypeScript errors during build
- Frontend container fails to start

**Solutions:**
1. Check frontend logs:
   ```powershell
   docker-compose logs frontend
   ```
2. Fix TypeScript errors in the code (see `frontend-fixes.md` for common fixes)
3. Rebuild the frontend service:
   ```powershell
   docker-compose build frontend
   docker-compose up -d frontend
   ```

#### Payment Service Issues

**Symptoms:**
- Payment service container starts but health check fails
- Cannot process payments

**Solutions:**
1. Check payment service logs:
   ```powershell
   docker-compose logs payment-service
   ```
2. Verify MongoDB connection:
   ```powershell
   docker exec smartfinance-payment-service wget -qO- http://localhost:3001/health
   ```
3. Restart the payment service:
   ```powershell
   docker-compose restart payment-service
   ```

### Database Issues

#### SQL Server Connection Issues

**Symptoms:**
- Backend fails to connect to SQL Server
- Error messages about database connection in backend logs

**Solutions:**
1. Check SQL Server logs:
   ```powershell
   docker-compose logs sqlserver
   ```
2. Verify SQL Server is running:
   ```powershell
   docker exec smartfinance-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P SmartFinance123! -Q "SELECT @@VERSION"
   ```
3. Restart SQL Server:
   ```powershell
   docker-compose restart sqlserver
   ```

#### MongoDB Connection Issues

**Symptoms:**
- Payment service fails to connect to MongoDB
- Error messages about database connection in payment service logs

**Solutions:**
1. Check MongoDB logs:
   ```powershell
   docker-compose logs mongodb
   ```
2. Verify MongoDB is running:
   ```powershell
   docker exec smartfinance-mongodb mongosh --eval "db.adminCommand('ping')"
   ```
3. Restart MongoDB:
   ```powershell
   docker-compose restart mongodb
   ```

### Network Issues

#### Services Can't Communicate

**Symptoms:**
- Services start but can't communicate with each other
- Error messages about connection refused

**Solutions:**
1. Test service communication:
   ```powershell
   .\scripts\test-service-communication.ps1
   ```
2. Verify Docker network:
   ```powershell
   docker network inspect smartfinance-network
   ```
3. Restart all services:
   ```powershell
   docker-compose down
   docker-compose up -d
   ```

### Resource Issues

#### Out of Memory

**Symptoms:**
- Services crash or become unresponsive
- Error messages about memory allocation

**Solutions:**
1. Increase Docker Desktop memory allocation:
   - Open Docker Desktop settings
   - Go to Resources > Advanced
   - Increase memory limit
2. Clean up unused Docker resources:
   ```powershell
   .\scripts\docker-cleanup.ps1
   ```

#### Disk Space Issues

**Symptoms:**
- Error messages about no space left on device
- Docker operations fail due to disk space

**Solutions:**
1. Clean up Docker resources:
   ```powershell
   .\scripts\docker-cleanup.ps1
   ```
2. Prune unused Docker resources:
   ```powershell
   docker system prune -a
   ```

## Useful Commands

### Docker Commands

```powershell
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f [service-name]

# Restart a specific service
docker-compose restart [service-name]

# Rebuild and restart a specific service
docker-compose build [service-name]
docker-compose up -d [service-name]

# Stop all services
docker-compose down

# Stop all services and remove volumes
docker-compose down -v

# Clean up Docker resources
.\scripts\docker-cleanup.ps1
```

### Troubleshooting Scripts

```powershell
# Check Docker Desktop status and troubleshoot issues
.\scripts\docker-desktop-troubleshoot.ps1

# Test communication between services
.\scripts\test-service-communication.ps1

# Clean up Docker resources
.\scripts\docker-cleanup.ps1
```

## Getting Help

If you continue to experience issues after trying the troubleshooting steps above, please:

1. Check the GitHub issues for similar problems and solutions
2. Create a new issue with detailed information about the problem
3. Include logs and error messages in your issue
4. Contact the SmartFinance team at support@smartfinance.com