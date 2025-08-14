#!/bin/bash

# SmartFinance Production Readiness Check
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SmartFinance Production Readiness Check${NC}"
echo "============================================="

CHECKS_PASSED=0
TOTAL_CHECKS=0

# Function to perform check
check_item() {
    local description="$1"
    local command="$2"
    local required="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Checking $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ FAIL (Required)${NC}"
        else
            echo -e "${YELLOW}⚠️ WARN (Optional)${NC}"
        fi
    fi
}

# Check file existence
check_file() {
    local description="$1"
    local file="$2"
    local required="$3"
    
    check_item "$description" "[ -f '$file' ]" "$required"
}

# Check directory existence
check_dir() {
    local description="$1"
    local dir="$2"
    local required="$3"
    
    check_item "$description" "[ -d '$dir' ]" "$required"
}

echo -e "${YELLOW}📋 Essential Files Check${NC}"
echo "========================"

# Essential configuration files
check_file "Docker Compose Production" "docker-compose.prod.yml" "true"
check_file "Environment Template" ".env.example" "true"
check_file "Deployment Script" "deploy.sh" "true"
check_file "Deployment Guide" "DEPLOYMENT_GUIDE.md" "true"
check_file "Main README" "README.md" "true"

# Infrastructure files
check_file "Terraform Main" "infrastructure/terraform/main.tf" "true"
check_file "Terraform Variables" "infrastructure/terraform/variables.tf" "true"
check_file "Terraform Outputs" "infrastructure/terraform/outputs.tf" "true"
check_file "AWS Deploy Script" "scripts/deploy-aws.sh" "true"

# Nginx configuration
check_file "Nginx Production Config" "nginx/nginx.prod.conf" "true"

# Application files
check_dir "Backend Source" "backend/src" "true"
check_dir "Frontend Source" "frontend/src" "true"
check_dir "Microservice Source" "microservice/src" "true"

echo ""
echo -e "${YELLOW}🐳 Docker Configuration Check${NC}"
echo "============================="

# Docker files
check_file "Backend Dockerfile" "backend/Dockerfile" "true"
check_file "Frontend Dockerfile" "frontend/Dockerfile" "true"
check_file "Microservice Dockerfile" "microservice/Dockerfile" "true"

echo ""
echo -e "${YELLOW}🔧 Scripts and Tools Check${NC}"
echo "=========================="

# Scripts
check_file "Production Setup Script" "scripts/setup-production.sh" "true"
check_file "Health Check Script" "scripts/health/health-check.sh" "false"
check_file "Backup Script" "scripts/backup/backup-databases.sh" "false"

echo ""
echo -e "${YELLOW}🚫 Unwanted Files Check${NC}"
echo "========================"

# Check for files that should NOT exist
UNWANTED_FILES=(
    "docs/ARCHITECTURE.md"
    "docs/DEVELOPMENT_WORKFLOW.md"
    "PROJECT_DELIVERY_STATUS.md"
    "frontend/IMPROVEMENTS.md"
    "frontend/README.md"
    "frontend/SHADCN_REFACTORING.md"
    ".env.production"
)

for file in "${UNWANTED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${RED}❌ Found unwanted file: $file${NC}"
    else
        echo -e "${GREEN}✅ Correctly removed: $file${NC}"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
done

echo ""
echo -e "${YELLOW}🔐 Security Check${NC}"
echo "=================="

# Check gitignore
if grep -q ".env.production" .gitignore; then
    echo -e "${GREEN}✅ .env.production is in .gitignore${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    echo -e "${RED}❌ .env.production not in .gitignore${NC}"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check for sensitive files in git
if git ls-files | grep -q ".env.production"; then
    echo -e "${RED}❌ .env.production is tracked by git${NC}"
else
    echo -e "${GREEN}✅ .env.production is not tracked by git${NC}"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

echo ""
echo -e "${YELLOW}📦 Dependencies Check${NC}"
echo "====================="

# Check package.json files
check_file "Frontend package.json" "frontend/package.json" "true"
check_file "Microservice package.json" "microservice/package.json" "true"

# Check .NET project files
check_file ".NET Solution" "backend/SmartFinance.sln" "true"

echo ""
echo -e "${BLUE}📊 Production Readiness Summary${NC}"
echo "=================================="

PASS_PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))

echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Failed: ${RED}$((TOTAL_CHECKS - CHECKS_PASSED))${NC}"
echo -e "Success Rate: ${BLUE}$PASS_PERCENTAGE%${NC}"

echo ""

if [ $PASS_PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🎉 PRODUCTION READY!${NC}"
    echo -e "${GREEN}Your SmartFinance application is ready for deployment.${NC}"
    echo ""
    echo -e "${YELLOW}📝 Next Steps:${NC}"
    echo "1. Run: ./deploy.sh (for local deployment)"
    echo "2. Run: ./scripts/deploy-aws.sh (for AWS deployment)"
    echo "3. Configure SSL certificates for production"
    echo "4. Set up monitoring and backups"
    exit 0
elif [ $PASS_PERCENTAGE -ge 75 ]; then
    echo -e "${YELLOW}⚠️ MOSTLY READY${NC}"
    echo -e "${YELLOW}Your application is mostly ready but has some issues to address.${NC}"
    exit 1
else
    echo -e "${RED}❌ NOT READY${NC}"
    echo -e "${RED}Your application has significant issues that need to be resolved.${NC}"
    exit 2
fi