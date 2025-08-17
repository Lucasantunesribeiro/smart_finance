#!/usr/bin/env pwsh

<#
.SYNOPSIS
AWS Cost Monitoring Script for SmartFinance
.DESCRIPTION
Monitors AWS costs and automatically shuts down resources if any costs are detected
Based on .kiro specifications for zero-cost enforcement
#>

param(
    [string]$Region = "us-east-1",
    [decimal]$CostThreshold = 0.01,
    [string]$EmailAddress = "",
    [switch]$AutoShutdown,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Colors for output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Blue = [System.ConsoleColor]::Blue

function Write-ColorOutput {
    param([string]$Message, [System.ConsoleColor]$Color = [System.ConsoleColor]::White)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Get-CurrentAWSCosts {
    try {
        Write-ColorOutput "Checking current AWS costs..." $Blue
        
        $endDate = Get-Date -Format "yyyy-MM-dd"
        $startDate = (Get-Date).AddDays(-30).ToString("yyyy-MM-dd")
        
        $costQuery = @{
            TimePeriod = @{
                Start = $startDate
                End = $endDate
            }
            Granularity = "MONTHLY"
            Metrics = @("BlendedCost")
        }
        
        $costJson = $costQuery | ConvertTo-Json -Depth 3
        $costs = aws ce get-cost-and-usage --cli-input-json $costJson --region us-east-1 | ConvertFrom-Json
        
        $totalCost = 0
        foreach ($result in $costs.ResultsByTime) {
            foreach ($group in $result.Groups) {
                $totalCost += [decimal]$group.Metrics.BlendedCost.Amount
            }
        }
        
        Write-ColorOutput "Current month cost: $$('{0:F2}' -f $totalCost)" $(if($totalCost -eq 0) { $Green } else { $Red })
        
        return $totalCost
    }
    catch {
        Write-ColorOutput "Failed to get cost information: $($_.Exception.Message)" $Red
        return -1
    }
}

function Get-FreeTierUsage {
    try {
        Write-ColorOutput "Checking free tier usage..." $Blue
        
        # Get EC2 usage
        $instances = aws ec2 describe-instances --query "Reservations[*].Instances[?State.Name=='running']" --region $Region | ConvertFrom-Json
        $runningInstances = @()
        
        foreach ($reservation in $instances) {
            if ($reservation -is [array]) {
                $runningInstances += $reservation
            }
        }
        
        Write-ColorOutput "Running EC2 instances: $($runningInstances.Count)" $(if($runningInstances.Count -eq 0) { $Green } else { $Yellow })
        
        foreach ($instance in $runningInstances) {
            Write-ColorOutput "  - Instance: $($instance.InstanceId) ($($instance.InstanceType))" $Yellow
            if ($instance.InstanceType -ne "t2.micro") {
                Write-ColorOutput "    ⚠️  WARNING: Non-free-tier instance type!" $Red
            }
        }
        
        return @{
            RunningInstances = $runningInstances.Count
            NonFreeTierInstances = ($runningInstances | Where-Object { $_.InstanceType -ne "t2.micro" }).Count
        }
    }
    catch {
        Write-ColorOutput "Failed to get free tier usage: $($_.Exception.Message)" $Red
        return @{ RunningInstances = -1; NonFreeTierInstances = -1 }
    }
}

function Stop-AllEC2Instances {
    try {
        Write-ColorOutput "Getting all running instances..." $Yellow
        
        $instances = aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --query "Reservations[*].Instances[*].InstanceId" --output text --region $Region
        
        if ($instances -and $instances.Trim() -ne "") {
            $instanceIds = $instances.Split(' ') | Where-Object { $_ -ne "" }
            
            Write-ColorOutput "Found $($instanceIds.Count) running instances" $Yellow
            
            if (-not $DryRun) {
                foreach ($instanceId in $instanceIds) {
                    Write-ColorOutput "Stopping instance: $instanceId" $Red
                    aws ec2 stop-instances --instance-ids $instanceId --region $Region | Out-Null
                }
                Write-ColorOutput "✓ All instances stop command sent" $Green
            }
            else {
                Write-ColorOutput "DRY RUN: Would stop $($instanceIds.Count) instances" $Yellow
            }
        }
        else {
            Write-ColorOutput "No running instances found" $Green
        }
    }
    catch {
        Write-ColorOutput "Failed to stop instances: $($_.Exception.Message)" $Red
        throw
    }
}

function Send-AlertEmail {
    param(
        [string]$Subject,
        [string]$Body,
        [string]$EmailAddress
    )
    
    if (-not $EmailAddress) {
        Write-ColorOutput "No email address configured for alerts" $Yellow
        return
    }
    
    try {
        # This would require SNS setup - for now just log
        Write-ColorOutput "EMAIL ALERT: $Subject" $Red
        Write-ColorOutput "Body: $Body" $Red
        
        # In a real implementation, you would use AWS SNS:
        # aws sns publish --topic-arn "arn:aws:sns:$Region:account:cost-alerts" --message "$Body" --subject "$Subject"
    }
    catch {
        Write-ColorOutput "Failed to send email alert: $($_.Exception.Message)" $Red
    }
}

function Start-CostMonitoring {
    Write-ColorOutput "🔍 Starting AWS Cost Monitoring" $Blue
    Write-ColorOutput "===============================" $Blue
    Write-ColorOutput "Cost Threshold: $$('{0:F2}' -f $CostThreshold)" $Blue
    Write-ColorOutput "Auto Shutdown: $AutoShutdown" $Blue
    Write-ColorOutput "Region: $Region" $Blue
    Write-ColorOutput "===============================" $Blue
    
    # Check current costs
    $currentCost = Get-CurrentAWSCosts
    
    if ($currentCost -eq -1) {
        Write-ColorOutput "❌ Unable to retrieve cost information" $Red
        return
    }
    
    # Check free tier usage
    $usage = Get-FreeTierUsage
    
    # Analyze costs
    $costExceeded = $currentCost -gt $CostThreshold
    $hasNonFreeTierInstances = $usage.NonFreeTierInstances -gt 0
    
    Write-ColorOutput "===============================" $Blue
    Write-ColorOutput "COST ANALYSIS RESULTS" $Blue
    Write-ColorOutput "===============================" $Blue
    Write-ColorOutput "Current Cost: $$('{0:F2}' -f $currentCost)" $(if($costExceeded) { $Red } else { $Green })
    Write-ColorOutput "Threshold: $$('{0:F2}' -f $CostThreshold)" $Blue
    Write-ColorOutput "Cost Exceeded: $costExceeded" $(if($costExceeded) { $Red } else { $Green })
    Write-ColorOutput "Non-Free Tier Instances: $($usage.NonFreeTierInstances)" $(if($hasNonFreeTierInstances) { $Red } else { $Green })
    Write-ColorOutput "===============================" $Blue
    
    # Take action if costs are detected
    if ($costExceeded -or $hasNonFreeTierInstances) {
        $alertMessage = @"
AWS Cost Alert for SmartFinance

Current Cost: $$('{0:F2}' -f $currentCost)
Threshold: $$('{0:F2}' -f $CostThreshold)
Non-Free Tier Instances: $($usage.NonFreeTierInstances)

$(if($costExceeded) { "⚠️ COST THRESHOLD EXCEEDED!" } else { "" })
$(if($hasNonFreeTierInstances) { "⚠️ NON-FREE-TIER INSTANCES DETECTED!" } else { "" })

Timestamp: $(Get-Date)
"@

        Write-ColorOutput $alertMessage $Red
        
        # Send alert email
        Send-AlertEmail -Subject "SmartFinance AWS Cost Alert" -Body $alertMessage -EmailAddress $EmailAddress
        
        # Auto shutdown if enabled
        if ($AutoShutdown) {
            Write-ColorOutput "🛑 AUTO SHUTDOWN TRIGGERED" $Red
            Write-ColorOutput "Shutting down all resources to prevent further costs..." $Red
            
            Stop-AllEC2Instances
            
            Write-ColorOutput "✅ Emergency shutdown completed" $Green
        }
        else {
            Write-ColorOutput "⚠️  Auto shutdown disabled. Manual intervention required." $Yellow
            Write-ColorOutput "To stop all instances, run: ./monitor-costs.ps1 -AutoShutdown" $Yellow
        }
    }
    else {
        Write-ColorOutput "✅ All systems normal - staying within free tier limits" $Green
    }
    
    # Create monitoring report
    $report = @{
        Timestamp = Get-Date
        CurrentCost = $currentCost
        CostThreshold = $CostThreshold
        CostExceeded = $costExceeded
        RunningInstances = $usage.RunningInstances
        NonFreeTierInstances = $usage.NonFreeTierInstances
        AutoShutdownTriggered = ($AutoShutdown -and ($costExceeded -or $hasNonFreeTierInstances))
    }
    
    $report | ConvertTo-Json | Out-File -FilePath "cost-monitoring-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    Write-ColorOutput "📊 Monitoring report saved" $Blue
}

# Main execution
try {
    # Verify AWS CLI and credentials
    $version = aws --version 2>$null
    if (-not $version) {
        Write-ColorOutput "❌ AWS CLI not found. Please install AWS CLI first." $Red
        exit 1
    }
    
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if (-not $identity) {
        Write-ColorOutput "❌ AWS credentials not configured. Please run 'aws configure'" $Red
        exit 1
    }
    
    Start-CostMonitoring
}
catch {
    Write-ColorOutput "❌ Cost monitoring failed: $($_.Exception.Message)" $Red
    Write-ColorOutput "Stack trace: $($_.ScriptStackTrace)" $Red
    exit 1
}