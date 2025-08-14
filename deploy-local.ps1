# SmartFinance Local Deployment Script for Windows

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🚀 SmartFinance Local Deployment" -ForegroundColor $Blue
Write-Host "================================" -ForegroundColor $Blue

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor $Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor $Red
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor $Green
} catch {
    Write-Host "❌ Docker Compose is not available." -ForegroundColor $Red
    exit 1
}

# Create production environment if it doesn't exist
if (!(Test-Path ".env.production")) {
    Write-Host "⚙️ Creating production environment file..." -ForegroundColor $Yellow
    
    # Load System.Web assembly for password generation
    Add-Type -AssemblyName System.Web
    
    # Generate secure passwords
    $SQLPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $MongoPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $RedisPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $JWTSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Web.Security.Membership]::GeneratePassword(32, 8)))
    
    $EnvContent = @"
# SmartFinance Production Environment Variables
NODE_ENV=production
ASPNETCORE_ENVIRONMENT=Production

# Database Passwords (Auto-generated)
SQL_PASSWORD=$SQLPassword
MONGO_PASSWORD=$MongoPassword
REDIS_PASSWORD=$RedisPassword

# JWT Configuration
JWT_SECRET=$JWTSecret
JWT_ISSUER=SmartFinance
JWT_AUDIENCE=SmartFinanceUsers

# Service URLs
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_SIGNALR_URL=/financehub
NEXT_PUBLIC_PAYMENT_SERVICE_URL=/payment

# Database Connections
ConnectionStrings__DefaultConnection=Data Source=smartfinance.db
ConnectionStrings__RedisConnection=redis:6379,password=`${REDIS_PASSWORD}
ConnectionStrings__MongoConnection=mongodb://admin:`${MONGO_PASSWORD}@mongodb:27017/smartfinance_logs?authSource=admin
"@

    $EnvContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "✅ Production environment created" -ForegroundColor $Green
}

# Stop any running containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor $Yellow
docker-compose -f docker-compose.prod.yml down -v 2>$null

# Build and start services
Write-Host "🏗️ Building and starting services..." -ForegroundColor $Yellow
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor $Yellow
Start-Sleep -Seconds 60

# Health checks
Write-Host "🔍 Performing health checks..." -ForegroundColor $Yellow

$FrontendOK = $false
$BackendOK = $false
$PaymentOK = $false

# Check Frontend
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $FrontendOK = $true
            Write-Host "✅ Frontend: OK" -ForegroundColor $Green
            break
        }
    } catch {
        Write-Host "Checking frontend... ($i/10)"
        Start-Sleep -Seconds 5
    }
}

# Check Backend
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $BackendOK = $true
            Write-Host "✅ Backend API: OK" -ForegroundColor $Green
            break
        }
    } catch {
        Write-Host "Checking backend... ($i/10)"
        Start-Sleep -Seconds 5
    }
}

# Check Payment Service
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            $PaymentOK = $true
            Write-Host "✅ Payment Service: OK" -ForegroundColor $Green
            break
        }
    } catch {
        Write-Host "Checking payment service... ($i/10)"
        Start-Sleep -Seconds 5
    }
}

# Show deployment status
Write-Host ""
Write-Host "📊 Deployment Status" -ForegroundColor $Blue
Write-Host "====================" -ForegroundColor $Blue

if ($FrontendOK) {
    Write-Host "✅ Frontend: Running" -ForegroundColor $Green
} else {
    Write-Host "❌ Frontend: Failed" -ForegroundColor $Red
}

if ($BackendOK) {
    Write-Host "✅ Backend API: Running" -ForegroundColor $Green
} else {
    Write-Host "❌ Backend API: Failed" -ForegroundColor $Red
}

if ($PaymentOK) {
    Write-Host "✅ Payment Service: Running" -ForegroundColor $Green
} else {
    Write-Host "❌ Payment Service: Failed" -ForegroundColor $Red
}

# Show container status
Write-Host ""
Write-Host "🐳 Container Status" -ForegroundColor $Blue
Write-Host "===================" -ForegroundColor $Blue
docker-compose -f docker-compose.prod.yml ps

# Show access URLs
Write-Host ""
Write-Host "SmartFinance Deployment Complete!" -ForegroundColor $Green
Write-Host "=====================================" -ForegroundColor $Green
Write-Host "Application: http://localhost" -ForegroundColor $Blue
Write-Host "Backend API: http://localhost:5000" -ForegroundColor $Blue
Write-Host "Payment Service: http://localhost:3001" -ForegroundColor $Blue
Write-Host "API Docs: http://localhost:5000/swagger" -ForegroundColor $Blue
Write-Host ""
Write-Host "📝 Useful Commands:" -ForegroundColor $Yellow
Write-Host "View logs: docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "Stop services: docker-compose -f docker-compose.prod.yml down"
Write-Host "Restart services: docker-compose -f docker-compose.prod.yml restart"
Write-Host ""
Write-Host "🔐 Security Note:" -ForegroundColor $Yellow
Write-Host "Secure passwords have been generated in .env.production"

# Check if all services are healthy
if ($FrontendOK -and $BackendOK -and $PaymentOK) {
    Write-Host "All services are running successfully!" -ForegroundColor $Green
    exit 0
} else {
    Write-Host "Some services may need attention. Check logs for details." -ForegroundColor $Yellow
    Write-Host "Run: docker-compose -f docker-compose.prod.yml logs"
    exit 1
}