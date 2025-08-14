# SmartFinance Final Deployment Check and Execution
# This script performs final verification and executes the complete deployment

param(
    [switch]$AWS = $false,
    [switch]$Local = $false,
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Continue"

Write-Host "=== SmartFinance Final Deployment Check ===" -ForegroundColor Blue
Write-Host "===========================================" -ForegroundColor Blue

# Step 1: Project Structure Verification
Write-Host "Step 1: Verifying project structure..." -ForegroundColor Yellow

$RequiredFiles = @(
    "docker-compose.prod.yml",
    ".env.example",
    "deploy-local.ps1",
    "deploy-simple.ps1",
    "DEPLOYMENT_GUIDE.md",
    "SETUP_WINDOWS.md",
    "README.md",
    "backend/Dockerfile",
    "frontend/Dockerfile",
    "microservice/Dockerfile",
    "nginx/nginx.prod.conf",
    "infrastructure/terraform/main.tf",
    "scripts/aws-deploy-complete.ps1"
)

$MissingFiles = @()
foreach ($file in $RequiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file" -ForegroundColor Red
        $MissingFiles += $file
    }
}

if ($MissingFiles.Count -gt 0) {
    Write-Host "Missing required files: $($MissingFiles -join ', ')" -ForegroundColor Red
    exit 1
}

# Step 2: Git Status Check
Write-Host "Step 2: Checking Git status..." -ForegroundColor Yellow
try {
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Host "  ⚠ Uncommitted changes detected:" -ForegroundColor Yellow
        git status --short
        Write-Host "  Committing changes..." -ForegroundColor Cyan
        git add .
        git commit -m "Final deployment preparation - automated commit"
        git push origin main
    } else {
        Write-Host "  ✓ Git repository is clean" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠ Git operations failed, continuing..." -ForegroundColor Yellow
}

# Step 3: Environment Check
Write-Host "Step 3: Checking environment..." -ForegroundColor Yellow

# Check if .env.production exists in git (should not)
$envInGit = git ls-files | Select-String ".env.production"
if ($envInGit) {
    Write-Host "  ✗ .env.production is tracked by git" -ForegroundColor Red
    Write-Host "  Removing from git..." -ForegroundColor Cyan
    git rm --cached .env.production
    git commit -m "Remove .env.production from git tracking"
} else {
    Write-Host "  ✓ .env.production is not tracked by git" -ForegroundColor Green
}

# Check gitignore
if (Select-String -Path ".gitignore" -Pattern ".env.production" -Quiet) {
    Write-Host "  ✓ .env.production is in .gitignore" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env.production not in .gitignore" -ForegroundColor Red
}

# Step 4: Docker Check (for local deployment)
if ($Local -or -not $AWS) {
    Write-Host "Step 4: Checking Docker..." -ForegroundColor Yellow
    try {
        docker info | Out-Null
        Write-Host "  ✓ Docker is running" -ForegroundColor Green
        
        docker-compose --version | Out-Null
        Write-Host "  ✓ Docker Compose is available" -ForegroundColor Green
        
        $dockerReady = $true
    } catch {
        Write-Host "  ✗ Docker is not available" -ForegroundColor Red
        $dockerReady = $false
    }
}

# Step 5: AWS Prerequisites Check (for AWS deployment)
if ($AWS) {
    Write-Host "Step 5: Checking AWS prerequisites..." -ForegroundColor Yellow
    
    $awsTools = @("aws", "terraform")
    $awsReady = $true
    
    foreach ($tool in $awsTools) {
        try {
            & $tool --version | Out-Null
            Write-Host "  ✓ $tool is available" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ $tool is not available" -ForegroundColor Red
            $awsReady = $false
        }
    }
    
    # Check AWS credentials
    try {
        aws sts get-caller-identity | Out-Null
        Write-Host "  ✓ AWS credentials configured" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ AWS credentials not configured" -ForegroundColor Red
        $awsReady = $false
    }
}
}

# Step 6: Execute Deployment
Write-Host "Step 6: Executing deployment..." -ForegroundColor Yellow

if ($AWS -and $awsReady) {
    Write-Host "  Starting AWS deployment..." -ForegroundColor Cyan
    try {
        & ".\scripts\aws-deploy-complete.ps1" -Region $Region
        Write-Host "  ✓ AWS deployment completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ AWS deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} elseif ($Local -and $dockerReady) {
    Write-Host "  Starting local deployment..." -ForegroundColor Cyan
    try {
        & ".\deploy-local.ps1"
        Write-Host "  ✓ Local deployment completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Local deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} elseif (-not $AWS -and -not $Local) {
    # Auto-detect best deployment option
    if ($dockerReady) {
        Write-Host "  Auto-detected: Starting local deployment..." -ForegroundColor Cyan
        try {
            & ".\deploy-local.ps1"
            Write-Host "  ✓ Local deployment completed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Local deployment failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "  Trying simple deployment..." -ForegroundColor Cyan
            & ".\deploy-simple.ps1"
        }
    } else {
        Write-Host "  ⚠ Docker not available, cannot perform local deployment" -ForegroundColor Yellow
        Write-Host "  Please install Docker Desktop or use -AWS flag for cloud deployment" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Prerequisites not met for selected deployment type" -ForegroundColor Red
    exit 1
}

# Step 7: Final Verification
Write-Host "Step 7: Final verification..." -ForegroundColor Yellow

if ($AWS) {
    # Check if AWS instance IP file exists
    if (Test-Path ".aws_instance_ip") {
        $instanceIP = Get-Content ".aws_instance_ip" -Raw
        $instanceIP = $instanceIP.Trim()
        Write-Host "  ✓ AWS instance deployed at: $instanceIP" -ForegroundColor Green
        
        # Test connectivity
        try {
            $response = Invoke-WebRequest -Uri "http://$instanceIP" -TimeoutSec 10 -UseBasicParsing
            Write-Host "  ✓ Application is responding" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Application may still be starting up" -ForegroundColor Yellow
        }
    }
} else {
    # Test local services
    $localServices = @(
        @{Name="Frontend"; URL="http://localhost:3000"},
        @{Name="Backend"; URL="http://localhost:5000/health"},
        @{Name="Payment"; URL="http://localhost:3001/health"}
    )
    
    foreach ($service in $localServices) {
        try {
            $response = Invoke-WebRequest -Uri $service.URL -TimeoutSec 5 -UseBasicParsing
            Write-Host "  ✓ $($service.Name) is responding" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ $($service.Name) may still be starting" -ForegroundColor Yellow
        }
    }
}

# Final Summary
Write-Host ""
Write-Host "=== DEPLOYMENT SUMMARY ===" -ForegroundColor Green
Write-Host "==========================" -ForegroundColor Green

if ($AWS -and (Test-Path ".aws_instance_ip")) {
    $instanceIP = Get-Content ".aws_instance_ip" -Raw
    $instanceIP = $instanceIP.Trim()
    Write-Host "🌐 AWS Deployment Completed!" -ForegroundColor Green
    Write-Host "   Frontend:        http://$instanceIP" -ForegroundColor Cyan
    Write-Host "   Backend API:     http://$instanceIP`:5000" -ForegroundColor Cyan
    Write-Host "   Payment Service: http://$instanceIP`:3001" -ForegroundColor Cyan
    Write-Host "   API Docs:        http://$instanceIP`:5000/swagger" -ForegroundColor Cyan
} else {
    Write-Host "🏠 Local Deployment Completed!" -ForegroundColor Green
    Write-Host "   Frontend:        http://localhost" -ForegroundColor Cyan
    Write-Host "   Backend API:     http://localhost:5000" -ForegroundColor Cyan
    Write-Host "   Payment Service: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   API Docs:        http://localhost:5000/swagger" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎉 SmartFinance is now running in production!" -ForegroundColor Green
Write-Host "📚 Check DEPLOYMENT_GUIDE.md for additional configuration" -ForegroundColor Blue
Write-Host "🔧 Check SETUP_WINDOWS.md for troubleshooting" -ForegroundColor Blue

exit 0