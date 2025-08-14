# SmartFinance AWS Deployment Script - Fixed Version
param(
    [string]$Region = "us-east-1",
    [string]$InstanceType = "t3.medium"
)

$ErrorActionPreference = "Stop"

Write-Host "SmartFinance AWS Deployment" -ForegroundColor Blue
Write-Host "===========================" -ForegroundColor Blue
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Instance Type: $InstanceType" -ForegroundColor Cyan

# Step 1: Check Prerequisites
Write-Host "Step 1: Checking Prerequisites..." -ForegroundColor Yellow

$RequiredTools = @("aws", "terraform", "git")
$MissingTools = @()

foreach ($tool in $RequiredTools) {
    try {
        & $tool --version | Out-Null
        Write-Host "  OK: $tool is installed" -ForegroundColor Green
    } catch {
        $MissingTools += $tool
        Write-Host "  MISSING: $tool" -ForegroundColor Red
    }
}

if ($MissingTools.Count -gt 0) {
    Write-Host "Missing tools: $($MissingTools -join ', ')" -ForegroundColor Red
    Write-Host "Please install missing tools first" -ForegroundColor Yellow
    exit 1
}

# Check AWS credentials
try {
    aws sts get-caller-identity | Out-Null
    Write-Host "  OK: AWS credentials configured" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Run: aws configure" -ForegroundColor Yellow
    exit 1
}

# Step 2: Generate SSH Key
Write-Host "Step 2: Setting up SSH Key..." -ForegroundColor Yellow
$SSHKeyPath = "$env:USERPROFILE\.ssh\smartfinance_key"

if (-not (Test-Path $SSHKeyPath)) {
    Write-Host "  Generating SSH key pair..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
    ssh-keygen -t rsa -b 4096 -f $SSHKeyPath -N '""' -C "smartfinance-aws-key"
    Write-Host "  OK: SSH key generated" -ForegroundColor Green
} else {
    Write-Host "  OK: SSH key already exists" -ForegroundColor Green
}

# Step 3: Setup Terraform
Write-Host "Step 3: Configuring Terraform..." -ForegroundColor Yellow
Push-Location "infrastructure\terraform"

try {
    if (-not (Test-Path "terraform.tfvars")) {
        Copy-Item "terraform.tfvars.example" "terraform.tfvars"
        
        # Update terraform.tfvars
        $PublicKey = Get-Content "$SSHKeyPath.pub" -Raw
        $PublicKey = $PublicKey.Trim()
        
        $tfvarsContent = Get-Content "terraform.tfvars"
        $tfvarsContent = $tfvarsContent -replace 'public_key = ".*"', "public_key = `"$PublicKey`""
        $tfvarsContent = $tfvarsContent -replace 'aws_region    = ".*"', "aws_region    = `"$Region`""
        $tfvarsContent = $tfvarsContent -replace 'instance_type = ".*"', "instance_type = `"$InstanceType`""
        $tfvarsContent | Set-Content "terraform.tfvars"
        
        Write-Host "  OK: terraform.tfvars configured" -ForegroundColor Green
    } else {
        Write-Host "  OK: terraform.tfvars already exists" -ForegroundColor Green
    }
    
    # Initialize and apply Terraform
    Write-Host "  Initializing Terraform..." -ForegroundColor Cyan
    terraform init
    
    Write-Host "  Planning deployment..." -ForegroundColor Cyan
    terraform plan -out=tfplan
    
    Write-Host "  Applying Terraform configuration..." -ForegroundColor Cyan
    terraform apply -auto-approve tfplan
    
    # Get outputs
    $InstanceIP = terraform output -raw instance_public_ip
    $InstanceID = terraform output -raw instance_id
    
    Write-Host "  OK: Infrastructure deployed successfully!" -ForegroundColor Green
    Write-Host "    Instance IP: $InstanceIP" -ForegroundColor Cyan
    Write-Host "    Instance ID: $InstanceID" -ForegroundColor Cyan
    
} finally {
    Pop-Location
}

# Save instance info
$InstanceIP | Out-File -FilePath ".aws_instance_ip" -Encoding UTF8
$InstanceID | Out-File -FilePath ".aws_instance_id" -Encoding UTF8

# Step 4: Wait for Instance
Write-Host "Step 4: Waiting for instance to be ready..." -ForegroundColor Yellow
$MaxAttempts = 30
$Attempt = 1

do {
    Write-Host "  Attempt $Attempt/$MaxAttempts - Testing SSH connection..." -ForegroundColor Cyan
    try {
        $result = ssh -i $SSHKeyPath -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$InstanceIP "echo 'SSH Ready'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK: Instance is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Continue waiting
    }
    
    Start-Sleep -Seconds 20
    $Attempt++
} while ($Attempt -le $MaxAttempts)

if ($Attempt -gt $MaxAttempts) {
    Write-Host "  ERROR: Instance not responding after 10 minutes" -ForegroundColor Red
    exit 1
}

# Step 5: Create Production Environment
Write-Host "Step 5: Creating production environment..." -ForegroundColor Yellow

if (-not (Test-Path ".env.production")) {
    # Generate secure passwords
    Add-Type -AssemblyName System.Web
    $SQLPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $MongoPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $RedisPassword = [System.Web.Security.Membership]::GeneratePassword(25, 5)
    $JWTSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Web.Security.Membership]::GeneratePassword(32, 8)))
    
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
ConnectionStrings__RedisConnection=redis:6379,password=`${REDIS_PASSWORD}
ConnectionStrings__MongoConnection=mongodb://admin:`${MONGO_PASSWORD}@mongodb:27017/smartfinance_logs?authSource=admin
"@

    $EnvContent | Out-File -FilePath ".env.production" -Encoding UTF8
    Write-Host "  OK: Production environment created with secure passwords" -ForegroundColor Green
}

# Step 6: Deploy Application
Write-Host "Step 6: Deploying application to EC2..." -ForegroundColor Yellow

# Create deployment package
Write-Host "  Creating deployment package..." -ForegroundColor Cyan
$TempDir = "$env:TEMP\smartfinance-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy essential files
$FilesToCopy = @(
    "backend",
    "frontend", 
    "microservice",
    "nginx",
    "docs",
    "docker-compose.prod.yml",
    ".env.production"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Write-Host "    Copying $file..." -ForegroundColor DarkCyan
        Copy-Item $file "$TempDir\" -Recurse -Force
    }
}

# Upload to instance
Write-Host "  Uploading files to EC2 instance..." -ForegroundColor Cyan
scp -i $SSHKeyPath -o StrictHostKeyChecking=no -r "$TempDir\*" ubuntu@$InstanceIP`:/opt/smartfinance/

# Deploy on instance
Write-Host "  Running deployment on EC2 instance..." -ForegroundColor Cyan
ssh -i $SSHKeyPath -o StrictHostKeyChecking=no ubuntu@$InstanceIP "cd /opt/smartfinance && sudo chown -R ubuntu:ubuntu /opt/smartfinance && docker-compose -f docker-compose.prod.yml down -v && docker-compose -f docker-compose.prod.yml up -d --build"

# Clean up
Remove-Item $TempDir -Recurse -Force

Write-Host "  OK: Application deployed successfully!" -ForegroundColor Green

# Step 7: Health Checks
Write-Host "Step 7: Performing health checks..." -ForegroundColor Yellow

Start-Sleep -Seconds 30

$Services = @(
    @{Name="Frontend"; URL="http://$InstanceIP"},
    @{Name="Backend API"; URL="http://$InstanceIP`:5000/health"},
    @{Name="Payment Service"; URL="http://$InstanceIP`:3001/health"}
)

foreach ($service in $Services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 10 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "  OK: $($service.Name)" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: $($service.Name) - Status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ERROR: $($service.Name) - Failed" -ForegroundColor Red
    }
}

# Final Summary
Write-Host ""
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Application URLs:" -ForegroundColor Blue
Write-Host "   Frontend:        http://$InstanceIP" -ForegroundColor Cyan
Write-Host "   Backend API:     http://$InstanceIP`:5000" -ForegroundColor Cyan
Write-Host "   Payment Service: http://$InstanceIP`:3001" -ForegroundColor Cyan
Write-Host "   API Docs:        http://$InstanceIP`:5000/swagger" -ForegroundColor Cyan
Write-Host ""
Write-Host "SSH Access:" -ForegroundColor Blue
Write-Host "   ssh -i $SSHKeyPath ubuntu@$InstanceIP" -ForegroundColor Cyan
Write-Host ""
Write-Host "SmartFinance is now running in production on AWS!" -ForegroundColor Green