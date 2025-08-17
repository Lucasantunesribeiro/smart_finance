# SmartFinance Advanced Monitoring System
param(
    [switch]$Install,
    [switch]$Start,
    [switch]$Stop,
    [switch]$Status,
    [switch]$Emergency
)

$ErrorActionPreference = "Stop"
$InstanceIP = "34.203.238.219"
$KeyFile = "smartfinance-keypair.pem"

function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logFile = "monitoring.log"
    $logEntry = "[$timestamp] [$Level] $Message"
    Write-Host $logEntry -ForegroundColor $(if($Level -eq "ERROR"){"Red"} elseif($Level -eq "WARN"){"Yellow"} else{"Green"})
    Add-Content -Path $logFile -Value $logEntry
}

function Test-AWSCosts {
    Write-Log "Checking AWS costs..."
    try {
        # Check current instance type
        $instanceInfo = aws ec2 describe-instances --region us-east-1 --query 'Reservations[0].Instances[0].[InstanceType,State.Name]' --output text
        $instanceType, $state = $instanceInfo -split '\s+'
        
        if ($instanceType -notin @("t2.micro", "t3.micro")) {
            Write-Log "WARNING: Instance type $instanceType is not free tier!" "ERROR"
            return $false
        }
        
        # Check EBS volumes
        $volumes = aws ec2 describe-volumes --region us-east-1 --query 'Volumes[*].[Size,VolumeType]' --output text
        foreach ($volume in $volumes -split "`n") {
            $size, $type = $volume -split '\s+'
            if ([int]$size -gt 30) {
                Write-Log "WARNING: EBS volume size $size GB exceeds free tier limit!" "WARN"
            }
        }
        
        Write-Log "✅ AWS resources within free tier limits"
        return $true
    }
    catch {
        Write-Log "Error checking AWS costs: $_" "ERROR"
        return $false
    }
}

function Test-ApplicationHealth {
    Write-Log "Checking application health..."
    
    $endpoints = @(
        @{Name="Frontend"; URL="http://$InstanceIP"; Expected=200},
        @{Name="MongoDB"; Command="docker exec smartfinance-mongodb mongosh --eval 'db.adminCommand(`"ping`")' --quiet"}
    )
    
    $allHealthy = $true
    
    foreach ($endpoint in $endpoints) {
        try {
            if ($endpoint.URL) {
                $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 10 -UseBasicParsing
                if ($response.StatusCode -eq $endpoint.Expected) {
                    Write-Log "✅ $($endpoint.Name): Healthy"
                } else {
                    Write-Log "❌ $($endpoint.Name): Unhealthy (Status: $($response.StatusCode))" "ERROR"
                    $allHealthy = $false
                }
            }
            elseif ($endpoint.Command) {
                ssh -i $KeyFile ec2-user@$InstanceIP $endpoint.Command | Out-Null
                Write-Log "✅ $($endpoint.Name): Healthy"
            }
        }
        catch {
            Write-Log "❌ $($endpoint.Name): Unhealthy - $_" "ERROR"
            $allHealthy = $false
        }
    }
    
    return $allHealthy
}

function Get-ResourceUsage {
    Write-Log "Checking resource usage..."
    try {
        $stats = ssh -i $KeyFile ec2-user@$InstanceIP "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'"
        Write-Log "Container Resource Usage:"
        Write-Log $stats
        
        $memInfo = ssh -i $KeyFile ec2-user@$InstanceIP "free -h"
        Write-Log "System Memory Usage:"
        Write-Log $memInfo
    }
    catch {
        Write-Log "Error getting resource usage: $_" "ERROR"
    }
}

function Start-EmergencyShutdown {
    Write-Log "🚨 EMERGENCY SHUTDOWN INITIATED!" "ERROR"
    
    try {
        # Stop all containers
        ssh -i $KeyFile ec2-user@$InstanceIP "docker stop \$(docker ps -q)"
        Write-Log "All containers stopped"
        
        # Stop EC2 instance
        $instanceId = aws ec2 describe-instances --region us-east-1 --query 'Reservations[0].Instances[0].InstanceId' --output text
        aws ec2 stop-instances --instance-ids $instanceId --region us-east-1
        Write-Log "EC2 instance $instanceId stopped"
        
        Write-Log "Emergency shutdown completed successfully"
    }
    catch {
        Write-Log "Error during emergency shutdown: $_" "ERROR"
    }
}

function Install-MonitoringService {
    Write-Log "Installing monitoring service..."
    
    # Create monitoring script on EC2
    $monitoringScript = @'
#!/bin/bash
# SmartFinance Health Monitor

LOG_FILE="/var/log/smartfinance-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2" | tee -a $LOG_FILE
}'@

check_containers() {
    if ! docker ps | grep -q smartfinance; then
        log "ERROR" "No SmartFinance containers running"
        return 1
    fi
    
    # Check if containers are healthy
    unhealthy=$(docker ps --filter "health=unhealthy" --format "{{.Names}}")
    if [ ! -z "$unhealthy" ]; then
        log "WARN" "Unhealthy containers: $unhealthy"
        # Restart unhealthy containers
        echo $unhealthy | xargs docker restart
        log "INFO" "Restarted unhealthy containers"
    fi
    
    return 0
}

check_memory() {
    mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ $mem_usage -gt 90 ]; then
        log "ERROR" "Memory usage critical: ${mem_usage}%"
        return 1
    elif [ $mem_usage -gt 80 ]; then
        log "WARN" "Memory usage high: ${mem_usage}%"
    fi
    return 0
}

# Main monitoring loop
log "INFO" "Starting health check"
check_containers
check_memory
log "INFO" "Health check completed"
'@

    # Upload monitoring script
    $monitoringScript | Out-File -FilePath "health-monitor.sh" -Encoding UTF8
    scp -i $KeyFile health-monitor.sh ec2-user@${InstanceIP}:/tmp/
    
    ssh -i $KeyFile ec2-user@$InstanceIP @"
sudo mv /tmp/health-monitor.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/health-monitor.sh
sudo chown root:root /usr/local/bin/health-monitor.sh

# Create cron job for monitoring (every 5 minutes)
echo '*/5 * * * * /usr/local/bin/health-monitor.sh' | sudo crontab -

# Create log rotation
sudo tee /etc/logrotate.d/smartfinance-monitor > /dev/null << 'EOF'
/var/log/smartfinance-monitor.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
}
EOF
"@

    Remove-Item "health-monitor.sh" -Force
    Write-Log "✅ Monitoring service installed successfully"
}

# Main execution
switch ($true) {
    $Install {
        Install-MonitoringService
    }
    $Start {
        Write-Log "Starting monitoring system..."
        ssh -i $KeyFile ec2-user@$InstanceIP "sudo systemctl start crond && sudo systemctl enable crond"
        Write-Log "✅ Monitoring system started"
    }
    $Stop {
        Write-Log "Stopping monitoring system..."
        ssh -i $KeyFile ec2-user@$InstanceIP "sudo crontab -r"
        Write-Log "✅ Monitoring system stopped"
    }
    $Status {
        Write-Log "=== SmartFinance System Status ==="
        Test-AWSCosts
        Test-ApplicationHealth
        Get-ResourceUsage
        Write-Log "=== Status Check Complete ==="
    }
    $Emergency {
        Start-EmergencyShutdown
    }
    default {
        Write-Log "SmartFinance Monitoring System"
        Write-Log "Usage:"
        Write-Log "  -Install    Install monitoring service on EC2"
        Write-Log "  -Start      Start monitoring service"
        Write-Log "  -Stop       Stop monitoring service"
        Write-Log "  -Status     Check system status"
        Write-Log "  -Emergency  Emergency shutdown"
    }
}