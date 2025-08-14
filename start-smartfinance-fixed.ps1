# SmartFinance Quick Start Script - Fixed Version
param(
    [switch]$AWS,
    [switch]$Local,
    [switch]$Help
)

if ($Help) {
    Write-Host "SmartFinance Quick Start" -ForegroundColor Blue
    Write-Host "========================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\start-smartfinance-fixed.ps1           # Auto-detect best method"
    Write-Host "  .\start-smartfinance-fixed.ps1 -Local    # Force local deployment"
    Write-Host "  .\start-smartfinance-fixed.ps1 -AWS      # Force AWS deployment"
    Write-Host "  .\start-smartfinance-fixed.ps1 -Help     # Show this help"
    Write-Host ""
    Write-Host "Requirements:" -ForegroundColor Yellow
    Write-Host "  Local:  Docker Desktop installed and running"
    Write-Host "  AWS:    AWS CLI, Terraform, and configured credentials"
    Write-Host ""
    exit 0
}

Write-Host "SmartFinance Quick Start" -ForegroundColor Blue
Write-Host "========================" -ForegroundColor Blue

# Auto-detect deployment method if not specified
if (-not $AWS -and -not $Local) {
    Write-Host "Auto-detecting best deployment method..." -ForegroundColor Yellow
    
    # Check Docker first (easier for local development)
    try {
        docker info | Out-Null
        Write-Host "Docker detected - using local deployment" -ForegroundColor Green
        $Local = $true
    } catch {
        # Check AWS tools
        try {
            aws --version | Out-Null
            terraform --version | Out-Null
            aws sts get-caller-identity | Out-Null
            Write-Host "AWS tools detected - using AWS deployment" -ForegroundColor Green
            $AWS = $true
        } catch {
            Write-Host "Neither Docker nor AWS tools are properly configured" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please install one of the following:" -ForegroundColor Yellow
            Write-Host "  1. Docker Desktop (for local development)"
            Write-Host "  2. AWS CLI + Terraform (for cloud deployment)"
            Write-Host ""
            Write-Host "See SETUP_WINDOWS.md for detailed instructions" -ForegroundColor Blue
            exit 1
        }
    }
}

# Execute the appropriate deployment
if ($Local) {
    Write-Host "Starting local deployment..." -ForegroundColor Cyan
    .\deploy-simple.ps1
} elseif ($AWS) {
    Write-Host "Starting AWS deployment..." -ForegroundColor Cyan
    .\scripts\aws-deploy-fixed.ps1
}

Write-Host ""
Write-Host "SmartFinance startup completed!" -ForegroundColor Green