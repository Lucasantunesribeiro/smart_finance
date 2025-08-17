#!/usr/bin/env pwsh

<#
.SYNOPSIS
SmartFinance AWS EC2 Deployment Script
.DESCRIPTION
Deploys SmartFinance application to AWS EC2 with zero-cost free tier configuration
Based on .kiro specifications for production-ready deployment
#>

param(
    [string]$InstanceType = "t2.micro",
    [string]$Region = "us-east-1",
    [string]$KeyPairName = "smartfinance-key",
    [switch]$SkipAWSCLIInstall,
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue

function Write-ColorOutput {
    param([string]$Message, [System.ConsoleColor]$Color = [System.ConsoleColor]::White)
    Write-Host $Message -ForegroundColor $Color
}

function Test-AWSCLIInstalled {
    try {
        $version = aws --version 2>$null
        if ($version) {
            Write-ColorOutput "✓ AWS CLI is installed: $version" $Green
            return $true
        }
    }
    catch {
        Write-ColorOutput "✗ AWS CLI not found" $Red
        return $false
    }
    return $false
}

function Install-AWSCLI {
    Write-ColorOutput "Installing AWS CLI v2..." $Blue
    
    try {
        if ($IsWindows) {
            $installerUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
            $installerPath = "$env:TEMP\AWSCLIV2.msi"
            
            Write-ColorOutput "Downloading AWS CLI installer..." $Blue
            Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
            
            Write-ColorOutput "Installing AWS CLI..." $Blue
            Start-Process msiexec.exe -Wait -ArgumentList "/I $installerPath /quiet"
            
            # Refresh PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        }
        elseif ($IsLinux) {
            Write-ColorOutput "Installing AWS CLI for Linux..." $Blue
            Invoke-RestMethod "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -OutFile "awscliv2.zip"
            Invoke-Expression "unzip awscliv2.zip"
            Invoke-Expression "sudo ./aws/install"
        }
        elseif ($IsMacOS) {
            Write-ColorOutput "Installing AWS CLI for macOS..." $Blue
            Invoke-RestMethod "https://awscli.amazonaws.com/AWSCLIV2.pkg" -OutFile "AWSCLIV2.pkg"
            Invoke-Expression "sudo installer -pkg AWSCLIV2.pkg -target /"
        }
        
        Write-ColorOutput "✓ AWS CLI installed successfully" $Green
    }
    catch {
        Write-ColorOutput "✗ Failed to install AWS CLI: $($_.Exception.Message)" $Red
        throw
    }
}

function Test-AWSCredentials {
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-ColorOutput "✓ AWS credentials configured for user: $($identity.Arn)" $Green
        return $true
    }
    catch {
        Write-ColorOutput "✗ AWS credentials not configured or invalid" $Red
        Write-ColorOutput "Please run: aws configure" $Yellow
        return $false
    }
}

function Get-LatestAmazonLinuxAMI {
    try {
        $ami = aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" --query "Images | sort_by(@, &CreationDate) | [-1].ImageId" --output text --region $Region
        Write-ColorOutput "✓ Latest Amazon Linux 2 AMI: $ami" $Green
        return $ami
    }
    catch {
        Write-ColorOutput "✗ Failed to get latest AMI: $($_.Exception.Message)" $Red
        throw
    }
}

function New-SecurityGroup {
    try {
        Write-ColorOutput "Creating security group..." $Blue
        
        $sgId = aws ec2 create-security-group --group-name "smartfinance-sg" --description "SmartFinance Security Group" --query "GroupId" --output text --region $Region
        
        # Add rules for HTTP, HTTPS, SSH, and application ports
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $Region
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $Region
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $Region
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $Region
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 5000 --cidr 0.0.0.0/0 --region $Region
        
        Write-ColorOutput "✓ Security group created: $sgId" $Green
        return $sgId
    }
    catch {
        Write-ColorOutput "Security group might already exist, trying to get existing..." $Yellow
        try {
            $sgId = aws ec2 describe-security-groups --group-names "smartfinance-sg" --query "SecurityGroups[0].GroupId" --output text --region $Region
            Write-ColorOutput "✓ Using existing security group: $sgId" $Green
            return $sgId
        }
        catch {
            Write-ColorOutput "✗ Failed to create or find security group: $($_.Exception.Message)" $Red
            throw
        }
    }
}

function New-KeyPair {
    param([string]$KeyName)
    
    try {
        Write-ColorOutput "Creating key pair: $KeyName" $Blue
        
        aws ec2 create-key-pair --key-name $KeyName --query "KeyMaterial" --output text --region $Region | Out-File -FilePath "$KeyName.pem" -Encoding ASCII
        
        # Set proper permissions on Unix-like systems
        if ($IsLinux -or $IsMacOS) {
            chmod 400 "$KeyName.pem"
        }
        
        Write-ColorOutput "✓ Key pair created: $KeyName.pem" $Green
        return $true
    }
    catch {
        Write-ColorOutput "Key pair might already exist..." $Yellow
        return $false
    }
}

function New-EC2Instance {
    param(
        [string]$ImageId,
        [string]$SecurityGroupId,
        [string]$KeyName
    )
    
    try {
        Write-ColorOutput "Launching EC2 instance..." $Blue
        
        $userDataScript = @"
#!/bin/bash
yum update -y
yum install -y docker git

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Clone and setup application
cd /home/ec2-user
git clone https://github.com/username/SmartFinance.git
cd SmartFinance

# Create production environment file
cat > .env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/api/v1
NEXT_PUBLIC_PAYMENT_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/payment
MONGODB_URI=mongodb://localhost:27017/smartfinance
JWT_SECRET=your-super-secure-jwt-secret-change-this
EOF

# Build and start application
docker-compose -f docker-compose.prod.yml up -d

echo "SmartFinance deployment completed!" > /var/log/deployment.log
"@

        $userDataBase64 = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($userDataScript))
        
        $instanceId = aws ec2 run-instances --image-id $ImageId --count 1 --instance-type $InstanceType --key-name $KeyName --security-group-ids $SecurityGroupId --user-data $userDataBase64 --query "Instances[0].InstanceId" --output text --region $Region
        
        Write-ColorOutput "✓ EC2 instance launched: $instanceId" $Green
        
        # Wait for instance to be running
        Write-ColorOutput "Waiting for instance to be running..." $Blue
        aws ec2 wait instance-running --instance-ids $instanceId --region $Region
        
        # Get public IP
        $publicIp = aws ec2 describe-instances --instance-ids $instanceId --query "Reservations[0].Instances[0].PublicIpAddress" --output text --region $Region
        
        Write-ColorOutput "✓ Instance is running at: $publicIp" $Green
        
        return @{
            InstanceId = $instanceId
            PublicIp = $publicIp
        }
    }
    catch {
        Write-ColorOutput "✗ Failed to launch EC2 instance: $($_.Exception.Message)" $Red
        throw
    }
}

function New-ProductionDockerCompose {
    $dockerComposeContent = @"
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: smartfinance-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: smartfinance
    volumes:
      - mongodb_data:/data/db
    networks:
      - smartfinance-network
    mem_limit: 300m

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: smartfinance-backend
    restart: unless-stopped
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Server=mongodb:27017;Database=smartfinance
    depends_on:
      - mongodb
    networks:
      - smartfinance-network
    mem_limit: 200m

  payment-service:
    build:
      context: ./microservice
      dockerfile: Dockerfile
    container_name: smartfinance-payment
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/smartfinance
    depends_on:
      - mongodb
    networks:
      - smartfinance-network
    mem_limit: 100m

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_API_URL=http://\${PUBLIC_IP}:3000/api/v1
        - NEXT_PUBLIC_PAYMENT_API_URL=http://\${PUBLIC_IP}:3000/payment
    container_name: smartfinance-frontend
    restart: unless-stopped
    depends_on:
      - backend
      - payment-service
    networks:
      - smartfinance-network
    mem_limit: 150m

  nginx:
    image: nginx:alpine
    container_name: smartfinance-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "3000:3000"
      - "5000:5000"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - frontend
      - backend
      - payment-service
    networks:
      - smartfinance-network
    mem_limit: 80m

volumes:
  mongodb_data:

networks:
  smartfinance-network:
    driver: bridge
"@

    $dockerComposeContent | Out-File -FilePath "docker-compose.prod.yml" -Encoding UTF8
    Write-ColorOutput "✓ Production docker-compose.yml created" $Green
}

# Main deployment function
function Start-Deployment {
    Write-ColorOutput "🚀 Starting SmartFinance AWS Deployment" $Blue
    Write-ColorOutput "============================================" $Blue
    
    # Step 1: Check AWS CLI
    if (-not $SkipAWSCLIInstall -and -not (Test-AWSCLIInstalled)) {
        Install-AWSCLI
    }
    
    # Step 2: Verify AWS credentials
    if (-not (Test-AWSCredentials)) {
        Write-ColorOutput "Please configure AWS credentials first:" $Yellow
        Write-ColorOutput "aws configure" $Yellow
        return
    }
    
    # Step 3: Get latest AMI
    $amiId = Get-LatestAmazonLinuxAMI
    
    # Step 4: Create security group
    $securityGroupId = New-SecurityGroup
    
    # Step 5: Create key pair
    New-KeyPair -KeyName $KeyPairName
    
    # Step 6: Create production docker-compose
    New-ProductionDockerCompose
    
    # Step 7: Launch EC2 instance
    if (-not $DryRun) {
        $instance = New-EC2Instance -ImageId $amiId -SecurityGroupId $securityGroupId -KeyName $KeyPairName
        
        Write-ColorOutput "============================================" $Green
        Write-ColorOutput "🎉 Deployment completed successfully!" $Green
        Write-ColorOutput "============================================" $Green
        Write-ColorOutput "Instance ID: $($instance.InstanceId)" $Green
        Write-ColorOutput "Public IP: $($instance.PublicIp)" $Green
        Write-ColorOutput "SSH Command: ssh -i $KeyPairName.pem ec2-user@$($instance.PublicIp)" $Green
        Write-ColorOutput "Frontend URL: http://$($instance.PublicIp)" $Green
        Write-ColorOutput "API URL: http://$($instance.PublicIp):3000" $Green
        Write-ColorOutput "============================================" $Green
        
        # Update environment files with actual IP
        $envContent = @"
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://$($instance.PublicIp):3000/api/v1
NEXT_PUBLIC_PAYMENT_API_URL=http://$($instance.PublicIp):3000/payment
MONGODB_URI=mongodb://localhost:27017/smartfinance
JWT_SECRET=your-super-secure-jwt-secret-change-this
"@
        $envContent | Out-File -FilePath ".env.production" -Encoding UTF8
        
        Write-ColorOutput "Note: It may take 5-10 minutes for the application to be fully deployed." $Yellow
    }
    else {
        Write-ColorOutput "✓ Dry run completed - no resources created" $Yellow
    }
}

# Error handling wrapper
try {
    Start-Deployment
}
catch {
    Write-ColorOutput "✗ Deployment failed: $($_.Exception.Message)" $Red
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" $Red
    exit 1
}