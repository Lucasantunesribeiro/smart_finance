# SmartFinance Simple Deployment Script for Windows

Write-Host "SmartFinance Local Deployment" -ForegroundColor Blue
Write-Host "=============================" -ForegroundColor Blue

# Check if Docker is running
try {
    docker info | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker is running" -ForegroundColor Green
    } else {
        Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Create production environment if it doesn't exist
if (!(Test-Path ".env.production")) {
    Write-Host "Creating production environment file..." -ForegroundColor Yellow
    
    # Generate simple secure passwords
    $SQLPassword = "SmartFinance_SQL_2024!"
    $MongoPassword = "SmartFinance_Mongo_2024!"
    $RedisPassword = "SmartFinance_Redis_2024!"
    $JWTSecret = "SmartFinance_JWT_Secret_Key_2024_32_Chars_Long!"
    
    $EnvContent = @"
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

SQL_PASSWORD=$SQLPassword
MONGO_PASSWORD=$MongoPassword
REDIS_PASSWORD=$RedisPassword

JWT_SECRET=$JWTSecret
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment

ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=$RedisPassword
ConnectionStrings__MongoConnection=mongodb://admin:$MongoPassword@mongodb:27017/smartfinance_logs?authSource=admin
"@

    $EnvContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "Production environment created" -ForegroundColor Green
}

# Stop any running containers
Write-Host "Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down -v

# Build and start services
Write-Host "Building and starting services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services
Write-Host "Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Show container status
Write-Host "Container Status:" -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "SmartFinance Deployment Complete!" -ForegroundColor Green
Write-Host "Application: http://localhost" -ForegroundColor Blue
Write-Host "Backend API: http://localhost:5000" -ForegroundColor Blue
Write-Host "Payment Service: http://localhost:3001" -ForegroundColor Blue
Write-Host "API Docs: http://localhost:5000/swagger" -ForegroundColor Blue

Write-Host ""
Write-Host "To view logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Yellow
Write-Host "To stop: docker-compose -f docker-compose.prod.yml down" -ForegroundColor Yellow