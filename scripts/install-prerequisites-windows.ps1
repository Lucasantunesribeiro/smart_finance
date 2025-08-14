# SmartFinance Prerequisites Installation for Windows
# Run this script as Administrator

Write-Host "🚀 Installing SmartFinance Prerequisites for Windows" -ForegroundColor Blue
Write-Host "====================================================" -ForegroundColor Blue

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
}

# Install Terraform
Write-Host "🏗️ Installing Terraform..." -ForegroundColor Yellow
choco install terraform -y

# Install Git (if not present)
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "📝 Installing Git..." -ForegroundColor Yellow
    choco install git -y
}

# Install Docker Desktop (if not present)
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "🐳 Installing Docker Desktop..." -ForegroundColor Yellow
    choco install docker-desktop -y
    Write-Host "⚠️ Docker Desktop requires a restart after installation!" -ForegroundColor Yellow
}

# Refresh environment variables
refreshenv

Write-Host "✅ Prerequisites installation completed!" -ForegroundColor Green
Write-Host "" 
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Restart your computer if Docker was installed"
Write-Host "2. Configure AWS credentials: aws configure"
Write-Host "3. Generate SSH key: ssh-keygen -t rsa -b 4096 -f ~/.ssh/smartfinance_key"
Write-Host "4. Run deployment: ./scripts/deploy-aws.sh"
Write-Host ""
Write-Host "🔧 Verify installations:" -ForegroundColor Blue
Write-Host "terraform --version"
Write-Host "aws --version"
Write-Host "docker --version"
Write-Host "git --version"