# SmartFinance Production Deployment Script
param(
    [string]$InstanceIP = "34.203.238.219",
    [string]$KeyFile = "smartfinance-keypair.pem"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(if($Level -eq "ERROR"){"Red"} elseif($Level -eq "WARN"){"Yellow"} else{"Green"})
}

Write-Log "Starting SmartFinance Production Deployment"
Write-Log "Target Instance: $InstanceIP"

# Test SSH connection
Write-Log "Testing SSH connection..."
try {
    ssh -i $KeyFile -o ConnectTimeout=10 ec2-user@$InstanceIP "echo 'SSH connection successful'"
    Write-Log "✅ SSH connection established"
}
catch {
    Write-Log "❌ SSH connection failed: $_" "ERROR"
    exit 1
}

# Stop existing containers
Write-Log "Stopping existing containers..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance 2>/dev/null && docker-compose down 2>/dev/null || echo 'No existing containers'"

# Clean up old containers and images
Write-Log "Cleaning up Docker resources..."
ssh -i $KeyFile ec2-user@$InstanceIP "docker system prune -f && docker volume prune -f"

# Create project directory
Write-Log "Creating project directory..."
ssh -i $KeyFile ec2-user@$InstanceIP "sudo mkdir -p /opt/smartfinance && sudo chown ec2-user:ec2-user /opt/smartfinance"

# Create temporary archive for upload
Write-Log "Creating deployment archive..."
$tempDir = "$env:TEMP\smartfinance-deploy"
$archivePath = "$env:TEMP\smartfinance-deploy.tar.gz"

# Remove temp directory if exists
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy essential files only
$essentialPaths = @(
    "backend",
    "frontend", 
    "microservice",
    "nginx",
    "docker-compose.prod.yml",
    ".env.production"
)

foreach ($path in $essentialPaths) {
    if (Test-Path $path) {
        Write-Log "Copying $path..."
        if (Test-Path $path -PathType Container) {
            Copy-Item -Recurse $path "$tempDir\" -Force
        } else {
            Copy-Item $path "$tempDir\" -Force
        }
    }
}

# Create tar archive using WSL or Git Bash
Write-Log "Creating archive..."
try {
    Push-Location $tempDir
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        wsl tar -czf $archivePath *
    } elseif (Get-Command bash -ErrorAction SilentlyContinue) {
        bash -c "tar -czf '$archivePath' *"
    } else {
        # Fallback: use PowerShell compression
        Compress-Archive -Path * -DestinationPath "$env:TEMP\smartfinance-deploy.zip" -Force
        $archivePath = "$env:TEMP\smartfinance-deploy.zip"
    }
    Pop-Location
    Write-Log "✅ Archive created: $archivePath"
}
catch {
    Pop-Location
    Write-Log "❌ Archive creation failed: $_" "ERROR"
    exit 1
}

# Upload archive to EC2
Write-Log "Uploading archive to EC2..."
try {
    scp -i $KeyFile $archivePath ec2-user@${InstanceIP}:/tmp/
    Write-Log "✅ Archive uploaded successfully"
}
catch {
    Write-Log "❌ Archive upload failed: $_" "ERROR"
    exit 1
}

# Extract on EC2
Write-Log "Extracting files on EC2..."
ssh -i $KeyFile ec2-user@$InstanceIP @"
cd /opt/smartfinance
rm -rf smart_finance
mkdir -p smart_finance
cd smart_finance
if [[ -f /tmp/smartfinance-deploy.tar.gz ]]; then
    tar -xzf /tmp/smartfinance-deploy.tar.gz
elif [[ -f /tmp/smartfinance-deploy.zip ]]; then
    unzip -q /tmp/smartfinance-deploy.zip
fi
rm -f /tmp/smartfinance-deploy.*
"@

# Cleanup local temp files
Remove-Item -Force $archivePath -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

# Copy environment file
Write-Log "Setting up environment configuration..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance && cp .env.production .env"

# Build and start containers
Write-Log "Building and starting containers..."
ssh -i $KeyFile ec2-user@$InstanceIP @"
cd /opt/smartfinance/smart_finance
export COMPOSE_HTTP_TIMEOUT=300
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
"@

# Wait for services to start
Write-Log "Waiting for services to start..."
Start-Sleep 60

# Check container status
Write-Log "Checking container status..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance && docker-compose -f docker-compose.prod.yml ps"

# Test endpoints
Write-Log "Testing application endpoints..."

$endpoints = @(
    @{Name="Frontend"; URL="http://$InstanceIP"; Expected="200"},
    @{Name="Backend Health"; URL="http://$InstanceIP:5000/health"; Expected="200"},
    @{Name="Payment Health"; URL="http://$InstanceIP:3001/health"; Expected="200"}
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq $endpoint.Expected) {
            Write-Log "✅ $($endpoint.Name): OK ($($response.StatusCode))"
        } else {
            Write-Log "⚠️ $($endpoint.Name): Unexpected status $($response.StatusCode)" "WARN"
        }
    }
    catch {
        Write-Log "❌ $($endpoint.Name): Failed - $_" "ERROR"
    }
}

Write-Log "🎉 Production deployment completed!"
Write-Log "Application URLs:"
Write-Log "  Frontend: http://$InstanceIP"
Write-Log "  Backend API: http://$InstanceIP:5000"
Write-Log "  Payment Service: http://$InstanceIP:3001"
Write-Log "  API Documentation: http://$InstanceIP:5000/swagger"