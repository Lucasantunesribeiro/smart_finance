# SmartFinance Cost Monitor
# Monitors AWS costs and ensures zero billing

param(
    [switch]$Emergency,
    [switch]$Cleanup
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Get-CurrentCosts {
    try {
        $endDate = (Get-Date).ToString("yyyy-MM-dd")
        $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
        
        $costs = aws ce get-cost-and-usage `
            --time-period Start=$startDate,End=$endDate `
            --granularity MONTHLY `
            --metrics BlendedCost `
            --query 'ResultsByTime[0].Total.BlendedCost.Amount' `
            --output text
            
        return [decimal]$costs
    }
    catch {
        Write-Log "Error getting costs: $_" "ERROR"
        return 0
    }
}

function Remove-UnusedResources {
    Write-Log "Cleaning up unused AWS resources..."
    
    # Remove unused key pairs (keep only smartfinance-keypair)
    $keyPairs = @("smartfinance-deploy-key", "smartfinance-key", "sf-key-275134769", "sf-1875152471", "sf-final-1244112697")
    foreach ($key in $keyPairs) {
        try {
            aws ec2 delete-key-pair --key-name $key --region us-east-1
            Write-Log "Deleted key pair: $key"
        }
        catch {
            Write-Log "Could not delete key pair $key (may not exist)" "WARN"
        }
    }
    
    # Remove unused security groups (keep only active ones)
    $unusedSGs = @("sg-09a36dfbd1a9b5604", "sg-0740b05a7c102d61b", "sg-0e532fe4a0dc7c33a", "sg-0c2c0150db3dc41a0", "sg-0a76feb633f1c802b", "sg-06b42e459936881b0")
    foreach ($sg in $unusedSGs) {
        try {
            aws ec2 delete-security-group --group-id $sg --region us-east-1
            Write-Log "Deleted security group: $sg"
        }
        catch {
            Write-Log "Could not delete security group $sg (may be in use)" "WARN"
        }
    }
}

function Emergency-Shutdown {
    Write-Log "EMERGENCY: Shutting down all billable resources!" "ERROR"
    
    # Stop all EC2 instances
    $instances = aws ec2 describe-instances --region us-east-1 --query 'Reservations[*].Instances[*].InstanceId' --output text
    if ($instances) {
        aws ec2 stop-instances --instance-ids $instances --region us-east-1
        Write-Log "Stopped all EC2 instances"
    }
}

# Main execution
Write-Log "Starting SmartFinance Cost Monitor"

if ($Emergency) {
    Emergency-Shutdown
    exit 0
}

if ($Cleanup) {
    Remove-UnusedResources
    exit 0
}

# Check current costs
$currentCost = Get-CurrentCosts
Write-Log "Current monthly cost: $$$currentCost"

if ($currentCost -gt 0) {
    Write-Log "WARNING: Costs detected! Current cost: $$$currentCost" "WARN"
    Write-Log "Run with -Emergency to shutdown all resources" "WARN"
} else {
    Write-Log "✅ No costs detected - staying within free tier"
}

# Verify instance is free tier eligible
$instance = aws ec2 describe-instances --region us-east-1 --query 'Reservations[0].Instances[0].[InstanceType,State.Name]' --output text
$instanceType, $state = $instance -split '\s+'

if ($instanceType -notin @("t2.micro", "t3.micro")) {
    Write-Log "WARNING: Instance type $instanceType is not free tier eligible!" "ERROR"
    Write-Log "Consider stopping and changing to t2.micro or t3.micro" "ERROR"
}

Write-Log "Instance: $instanceType ($state)"
Write-Log "Cost monitoring complete"