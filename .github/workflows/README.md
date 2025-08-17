# GitHub Actions Workflows

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Deployment Secrets
- `EC2_SSH_PRIVATE_KEY`: Private key for SSH access to EC2 instance
- `EC2_HOST`: Public IP or DNS name of your EC2 instance

### Application Secrets
- `JWT_SECRET`: Secret key for JWT token signing
- `SQL_PASSWORD`: Password for SQL database
- `MONGO_PASSWORD`: Password for MongoDB
- `REDIS_PASSWORD`: Password for Redis
- `GRAFANA_PASSWORD`: Password for Grafana admin user

### Optional Secrets
- `SLACK_WEBHOOK`: Webhook URL for Slack notifications

## Workflows

### ci-cd.yml
Main CI/CD pipeline that runs on push and pull requests:
- Tests .NET backend
- Tests Next.js frontend  
- Tests payment microservice
- Runs security scans
- Builds and pushes Docker images (on main branch)
- Deploys to staging/production

### deploy.yml
Production deployment workflow:
- Builds and tests all components
- Deploys to EC2 instance
- Runs health checks
- Supports rollback on failure

### security-scan.yml
Scheduled security scanning:
- Runs daily at 2 AM UTC
- Scans for vulnerabilities
- Checks dependencies
- Uploads results to GitHub Security tab

## Usage

1. Push to `develop` branch triggers staging deployment
2. Push to `main` branch triggers production deployment
3. Manual deployment can be triggered via workflow_dispatch
4. Security scans run automatically on schedule