# SmartFinance Manual Deployment Script
# Simple deployment without special characters

Write-Host "SmartFinance Manual Deployment" -ForegroundColor Blue
Write-Host "==============================" -ForegroundColor Blue

# Step 1: Check Docker
Write-Host "Step 1: Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "  Docker is running" -ForegroundColor Green
} catch {
    Write-Host "  Docker is not running" -ForegroundColor Red
    Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Step 2: Create environment file
Write-Host "Step 2: Creating environment file..." -ForegroundColor Yellow
if (-not (Test-Path ".env.production")) {
    $envContent = @"
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

SQL_PASSWORD=SmartFinance_SQL_2024!
MONGO_PASSWORD=SmartFinance_Mongo_2024!
REDIS_PASSWORD=SmartFinance_Redis_2024!

JWT_SECRET=SmartFinance_JWT_Secret_Key_2024_32_Chars_Long!
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment

ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=SmartFinance_Redis_2024!
ConnectionStrings__MongoConnection=mongodb://admin:SmartFinance_Mongo_2024!@mongodb:27017/smartfinance_logs?authSource=admin
"@
    
    $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "  Environment file created" -ForegroundColor Green
} else {
    Write-Host "  Environment file already exists" -ForegroundColor Green
}

# Step 3: Stop existing containers
Write-Host "Step 3: Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down -v 2>$null

# Step 4: Build and start services
Write-Host "Step 4: Building and starting services..." -ForegroundColor Yellow
Write-Host "  This may take several minutes..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml up -d --build

# Step 5: Wait for services
Write-Host "Step 5: Waiting for services to start..." -ForegroundColor Yellow
Write-Host "  Waiting 60 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 60

# Step 6: Check services
Write-Host "Step 6: Checking services..." -ForegroundColor Yellow

$services = @(
    @{Name="Frontend"; URL="http://localhost:3000"},
    @{Name="Backend"; URL="http://localhost:5000/health"},
    @{Name="Payment"; URL="http://localhost:3001/health"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  $($service.Name): OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "  $($service.Name): Starting..." -ForegroundColor Yellow
    }
}

# Step 7: Show container status
Write-Host "Step 7: Container status..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

# Final results
Write-Host ""
Write-Host "DEPLOYMENT COMPLETED" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor Blue
Write-Host "  Frontend:        http://localhost" -ForegroundColor Cyan
Write-Host "  Backend API:     http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Payment Service: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  API Docs:        http://localhost:5000/swagger" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View logs:    docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "  Stop all:     docker-compose -f docker-compose.prod.yml down"
Write-Host "  Restart:      docker-compose -f docker-compose.prod.yml restart"
Write-Host ""
Write-Host "If services are still starting, wait a few more minutes and check again."