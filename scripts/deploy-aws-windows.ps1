# SmartFinance AWS Deployment Script for Windows
param(
    [string]$Region = "us-east-1",
    [string]$InstanceType = "t3.medium",
    [string]$KeyName = "smartfinance-key"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🚀 SmartFinance AWS Deployment for Windows" -ForegroundColor $Blue
Write-Host "===========================================" -ForegroundColor $Blue

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor $Yellow

$Prerequisites = @("terraform", "aws", "docker", "git")
$MissingPrereqs = @()

foreach ($prereq in $Prerequisites) {
    if (!(Get-Command $prereq -ErrorAction SilentlyContinue)) {
        $MissingPrereqs += $prereq
    }
}

if ($MissingPrereqs.Count -gt 0) {
    Write-Host "❌ Missing prerequisites: $($MissingPrereqs -join ', ')" -ForegroundColor $Red
    Write-Host "Run: ./scripts/install-prerequisites-windows.ps1" -ForegroundColor $Yellow
    exit 1
}

Write-Host "✅ Prerequisites check passed" -ForegroundColor $Green

# Check AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "✅ AWS credentials configured" -ForegroundColor $Green
} catch {
    Write-Host "❌ AWS credentials not configured. Run: aws configure" -ForegroundColor $Red
    exit 1
}

# Generate SSH key if it doesn't exist
$SSHKeyPath = "$env:USERPROFILE\.ssh\smartfinance_key"
if (!(Test-Path $SSHKeyPath)) {
    Write-Host "🔑 Generating SSH key pair..." -ForegroundColor $Yellow
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
    ssh-keygen -t rsa -b 4096 -f $SSHKeyPath -N '""' -C "smartfinance-aws-key"
    Write-Host "✅ SSH key generated at $SSHKeyPath" -ForegroundColor $Green
} else {
    Write-Host "✅ SSH key already exists" -ForegroundColor $Green
}

# Setup Terraform variables
Write-Host "⚙️ Setting up Terraform variables..." -ForegroundColor $Yellow

Set-Location "infrastructure\terraform"

if (!(Test-Path "terraform.tfvars")) {
    Copy-Item "terraform.tfvars.example" "terraform.tfvars"
    
    # Update public key in terraform.tfvars
    $PublicKey = Get-Content "$SSHKeyPath.pub" -Raw
    $PublicKey = $PublicKey.Trim()
    
    (Get-Content "terraform.tfvars") -replace 'public_key = ".*"', "public_key = `"$PublicKey`"" | Set-Content "terraform.tfvars"
    (Get-Content "terraform.tfvars") -replace 'aws_region    = ".*"', "aws_region    = `"$Region`"" | Set-Content "terraform.tfvars"
    (Get-Content "terraform.tfvars") -replace 'instance_type = ".*"', "instance_type = `"$InstanceType`"" | Set-Content "terraform.tfvars"
    
    Write-Host "✅ terraform.tfvars created and configured" -ForegroundColor $Green
} else {
    Write-Host "✅ terraform.tfvars already exists" -ForegroundColor $Green
}

# Deploy infrastructure
Write-Host "🏗️ Deploying infrastructure with Terraform..." -ForegroundColor $Yellow

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -out=tfplan

# Apply deployment
Write-Host "🚀 Applying Terraform configuration..." -ForegroundColor $Yellow
terraform apply tfplan

# Get outputs
$InstanceIP = terraform output -raw instance_public_ip
$InstanceID = terraform output -raw instance_id

Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor $Green
Write-Host "📋 Instance IP: $InstanceIP" -ForegroundColor $Blue
Write-Host "📋 Instance ID: $InstanceID" -ForegroundColor $Blue

Set-Location "..\..\"

# Save instance info
$InstanceIP | Out-File -FilePath ".aws_instance_ip" -Encoding UTF8
$InstanceID | Out-File -FilePath ".aws_instance_id" -Encoding UTF8

# Wait for instance to be ready
Write-Host "⏳ Waiting for instance to be ready..." -ForegroundColor $Yellow

$MaxAttempts = 30
$Attempt = 1

do {
    try {
        ssh -i $SSHKeyPath -o ConnectTimeout=5 -o StrictHostKeyChecking=no ubuntu@$InstanceIP "echo 'SSH connection successful'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Instance is ready!" -ForegroundColor $Green
            break
        }
    } catch {
        # Connection failed, continue waiting
    }
    
    Write-Host "Attempt $Attempt/$MaxAttempts`: Waiting for SSH..."
    Start-Sleep -Seconds 10
    $Attempt++
} while ($Attempt -le $MaxAttempts)

if ($Attempt -gt $MaxAttempts) {
    Write-Host "❌ Instance is not responding to SSH after 5 minutes" -ForegroundColor $Red
    exit 1
}

# Create production environment file
Write-Host "⚙️ Creating production environment..." -ForegroundColor $Yellow

if (!(Test-Path ".env.production")) {
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

# Deploy application to instance
Write-Host "📦 Deploying SmartFinance application..." -ForegroundColor $Yellow

# Create deployment archive
Write-Host "📤 Creating deployment package..." -ForegroundColor $Yellow
$TempDir = "$env:TEMP\smartfinance-deploy"
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy necessary files
$FilesToCopy = @(
    "backend",
    "frontend", 
    "microservice",
    "nginx",
    "docs",
    "scripts",
    "docker-compose.prod.yml",
    ".env.production",
    "deploy.sh"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file "$TempDir\" -Recurse -Force
    }
}

# Upload to instance
Write-Host "📤 Uploading application files..." -ForegroundColor $Yellow
scp -i $SSHKeyPath -o StrictHostKeyChecking=no -r "$TempDir\*" ubuntu@$InstanceIP`:/opt/smartfinance/

# Run deployment on instance
Write-Host "🚀 Starting application deployment..." -ForegroundColor $Yellow
ssh -i $SSHKeyPath -o StrictHostKeyChecking=no ubuntu@$InstanceIP @"
cd /opt/smartfinance
chmod +x deploy.sh
chmod +x scripts/*.sh
sudo ./deploy.sh
"@

# Clean up temp directory
Remove-Item $TempDir -Recurse -Force

# Show deployment info
Write-Host "🎉 SmartFinance deployment completed!" -ForegroundColor $Green
Write-Host "====================================" -ForegroundColor $Green
Write-Host "🌐 Application URL: http://$InstanceIP" -ForegroundColor $Blue
Write-Host "🔧 API URL: http://$InstanceIP`:5000" -ForegroundColor $Blue
Write-Host "💳 Payment Service: http://$InstanceIP`:3001" -ForegroundColor $Blue
Write-Host "📊 API Documentation: http://$InstanceIP`:5000/swagger" -ForegroundColor $Blue
Write-Host ""
Write-Host "🔑 SSH Access:" -ForegroundColor $Yellow
Write-Host "ssh -i $SSHKeyPath ubuntu@$InstanceIP"
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor $Yellow
Write-Host "1. Configure your domain DNS to point to $InstanceIP"
Write-Host "2. Set up SSL certificate (Let's Encrypt recommended)"
Write-Host "3. Configure monitoring and backups"
Write-Host "4. Review security settings"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor $Green