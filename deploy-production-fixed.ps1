# SmartFinance Production Deployment Script - Fixed Version
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

Write-Log "Starting SmartFinance Production Deployment (Fixed)"
Write-Log "Target Instance: $InstanceIP"

# Test SSH connection
Write-Log "Testing SSH connection..."
ssh -i $KeyFile -o ConnectTimeout=10 ec2-user@$InstanceIP "echo 'SSH connection successful'"
Write-Log "✅ SSH connection established"

# Install Docker Compose if not present
Write-Log "Installing Docker Compose..."
ssh -i $KeyFile ec2-user@$InstanceIP @"
# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
fi
docker-compose --version
"@

# Stop existing containers
Write-Log "Stopping existing containers..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance 2>/dev/null && docker-compose down 2>/dev/null || echo 'No existing containers'"

# Create project directory
Write-Log "Creating project directory..."
ssh -i $KeyFile ec2-user@$InstanceIP "sudo mkdir -p /opt/smartfinance/smart_finance && sudo chown -R ec2-user:ec2-user /opt/smartfinance"

# Upload files individually using SCP
Write-Log "Uploading docker-compose.prod.yml..."
scp -i $KeyFile docker-compose.prod.yml ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

Write-Log "Uploading .env.production..."
scp -i $KeyFile .env.production ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

Write-Log "Uploading nginx configuration..."
scp -i $KeyFile -r nginx ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

Write-Log "Uploading backend..."
scp -i $KeyFile -r backend ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

Write-Log "Uploading frontend..."
scp -i $KeyFile -r frontend ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

Write-Log "Uploading microservice..."
scp -i $KeyFile -r microservice ec2-user@${InstanceIP}:/opt/smartfinance/smart_finance/

# Set up environment
Write-Log "Setting up environment configuration..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance && cp .env.production .env"

# Build and start containers
Write-Log "Building and starting containers..."
ssh -i $KeyFile ec2-user@$InstanceIP @"
cd /opt/smartfinance/smart_finance
export COMPOSE_HTTP_TIMEOUT=300
export DOCKER_CLIENT_TIMEOUT=300
docker-compose -f docker-compose.prod.yml down || true
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
"@

# Wait for services to start
Write-Log "Waiting for services to start..."
Start-Sleep 90

# Check container status
Write-Log "Checking container status..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance && docker-compose -f docker-compose.prod.yml ps"

# Check Docker logs
Write-Log "Checking container logs..."
ssh -i $KeyFile ec2-user@$InstanceIP "cd /opt/smartfinance/smart_finance && docker-compose -f docker-compose.prod.yml logs --tail=20"

# Test endpoints
Write-Log "Testing application endpoints..."

$endpoints = @(
    @{Name="Frontend"; URL="http://$InstanceIP"},
    @{Name="Backend Health"; URL="http://$InstanceIP:5000/health"},
    @{Name="Payment Health"; URL="http://$InstanceIP:3001/health"}
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 15 -UseBasicParsing
        Write-Log "✅ $($endpoint.Name): OK ($($response.StatusCode))"
    }
    catch {
        Write-Log "❌ $($endpoint.Name): Failed - $($_.Exception.Message)" "ERROR"
    }
}

Write-Log "🎉 Production deployment completed!"
Write-Log "Application URLs:"
Write-Log "  Frontend: http://$InstanceIP"
Write-Log "  Backend API: http://$InstanceIP:5000"
Write-Log "  Payment Service: http://$InstanceIP:3001"
Write-Log "  API Documentation: http://$InstanceIP:5000/swagger"