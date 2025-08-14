# 🚀 SmartFinance Setup Guide for Windows

## Prerequisites Installation

### 1. Install Docker Desktop
1. Download Docker Desktop from: https://www.docker.com/products/docker-desktop/
2. Run the installer and follow the setup wizard
3. **Restart your computer** after installation
4. Start Docker Desktop from the Start menu
5. Wait for Docker to fully start (green icon in system tray)

### 2. Install Git (if not already installed)
1. Download Git from: https://git-scm.com/download/win
2. Run the installer with default settings

### 3. Install AWS CLI (for AWS deployment)
1. Download AWS CLI from: https://aws.amazon.com/cli/
2. Run the installer
3. Configure AWS credentials: `aws configure`

### 4. Install Terraform (for AWS deployment)
1. Download Terraform from: https://www.terraform.io/downloads
2. Extract to a folder (e.g., C:\terraform)
3. Add the folder to your PATH environment variable

## Quick Local Deployment

### Step 1: Clone Repository
```powershell
git clone https://github.com/lucasantunesribeiro/smart_finance.git
cd smart_finance
```

### Step 2: Start Docker Desktop
- Make sure Docker Desktop is running (green whale icon in system tray)
- If not running, start it from the Start menu and wait for it to fully load

### Step 3: Deploy Locally
```powershell
# Simple deployment
.\deploy-simple.ps1

# Or use the full deployment script
.\deploy-local.ps1
```

### Step 4: Access Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:5000
- **Payment Service**: http://localhost:3001
- **API Documentation**: http://localhost:5000/swagger

## AWS EC2 Deployment

### Prerequisites
1. AWS CLI configured with your credentials
2. Terraform installed and in PATH
3. SSH client available

### Step 1: Configure AWS
```powershell
aws configure
# Enter your AWS Access Key ID, Secret Access Key, Region, and Output format
```

### Step 2: Deploy to AWS
```powershell
# Install prerequisites (run as Administrator)
.\scripts\install-prerequisites-windows.ps1

# Deploy to AWS
.\scripts\deploy-aws-windows.ps1
```

### Step 3: Access Your Application
After deployment, you'll get the public IP address. Access:
- **Frontend**: http://YOUR-IP
- **Backend API**: http://YOUR-IP:5000
- **Payment Service**: http://YOUR-IP:3001

## Manual Docker Commands

If the scripts don't work, you can run these commands manually:

### Create Environment File
```powershell
# Copy the example file
Copy-Item .env.example .env.production

# Edit .env.production with your preferred text editor
notepad .env.production
```

### Start Services
```powershell
# Stop any existing containers
docker-compose -f docker-compose.prod.yml down -v

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

## Troubleshooting

### Docker Issues
- **"Docker is not running"**: Start Docker Desktop and wait for it to fully load
- **"Permission denied"**: Run PowerShell as Administrator
- **"Port already in use"**: Stop existing containers with `docker-compose down`

### Build Issues
- **"Build failed"**: Check Docker logs with `docker-compose logs [service-name]`
- **"Out of disk space"**: Clean Docker with `docker system prune -a`

### Network Issues
- **"Cannot connect to service"**: Check if all containers are running with `docker-compose ps`
- **"Health check failed"**: Wait longer for services to start, or check logs

### Environment Variables
- **"Variable not set"**: Make sure `.env.production` exists and has all required variables
- **"Invalid JWT secret"**: Ensure JWT_SECRET is at least 32 characters long

## Service Management

### View Logs
```powershell
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```powershell
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Stop Services
```powershell
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.prod.yml down -v
```

## Production Checklist

Before deploying to production:

- [ ] Docker Desktop is installed and running
- [ ] All environment variables are configured in `.env.production`
- [ ] Strong passwords are set for all services
- [ ] JWT secret is secure and at least 32 characters
- [ ] Firewall rules are configured (for AWS deployment)
- [ ] SSL certificates are configured (for production domains)
- [ ] Backup strategy is in place
- [ ] Monitoring is configured

## Support

If you encounter issues:

1. **Check Docker Status**: Ensure Docker Desktop is running
2. **Check Logs**: Use `docker-compose logs` to see error messages
3. **Check Ports**: Ensure ports 3000, 5000, and 3001 are not in use
4. **Check Environment**: Verify `.env.production` has all required variables
5. **Clean Start**: Try `docker-compose down -v` then rebuild

## Next Steps

After successful deployment:

1. **Configure Domain**: Point your domain to the server IP
2. **Setup SSL**: Use Let's Encrypt for HTTPS
3. **Configure Monitoring**: Set up health checks and alerts
4. **Setup Backups**: Configure automated database backups
5. **Security Review**: Review and harden security settings

---

**🎉 Your SmartFinance application is now ready to use!**