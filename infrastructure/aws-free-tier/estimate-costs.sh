#!/bin/bash
set -euo pipefail

# ============================================================================
# SmartFinance - AWS Cost Estimator
# ============================================================================
# Calcula custos mensais estimados baseado no uso atual
# ============================================================================

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_section() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

# Carregar variáveis se existirem
if [ -f .env.ec2 ]; then
    source .env.ec2
fi

# Região padrão
REGION=${REGION:-"us-east-1"}

# ============================================================================
# Verificar se está no Free Tier
# ============================================================================
log_section "VERIFICANDO STATUS DO FREE TIER"

echo ""
log_info "Verificando idade da conta AWS..."

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ACCOUNT_CREATION=$(aws iam get-account-summary --query 'SummaryMap.AccountAccessKeysPresent' --output text 2>/dev/null || echo "Unknown")

echo "Account ID: $ACCOUNT_ID"
echo ""

read -p "Sua conta AWS foi criada há menos de 12 meses? (s/n): " FREE_TIER_ACTIVE

if [ "$FREE_TIER_ACTIVE" = "s" ] || [ "$FREE_TIER_ACTIVE" = "S" ]; then
    IS_FREE_TIER=true
    log_info "✓ Free Tier ativo (12 meses grátis)"
else
    IS_FREE_TIER=false
    log_info "✗ Free Tier expirado (custos aplicáveis)"
fi

echo ""

# ============================================================================
# Obter informações de uso atual
# ============================================================================
if [ -n "${INSTANCE_ID:-}" ]; then
    log_section "OBTENDO INFORMAÇÕES DE USO"

    # EC2 Instance Type
    INSTANCE_TYPE=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].InstanceType' \
        --output text 2>/dev/null || echo "t2.micro")

    # EBS Volume Size
    VOLUME_ID=$(aws ec2 describe-instances \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
        --output text 2>/dev/null || echo "")

    if [ -n "$VOLUME_ID" ]; then
        VOLUME_SIZE=$(aws ec2 describe-volumes \
            --volume-ids "$VOLUME_ID" \
            --query 'Volumes[0].Size' \
            --output text 2>/dev/null || echo "20")
    else
        VOLUME_SIZE=20
    fi

    # S3 Bucket Size
    if [ -n "${BACKUP_BUCKET:-}" ]; then
        S3_SIZE=$(aws s3 ls s3://"$BACKUP_BUCKET" --recursive --summarize 2>/dev/null | \
            grep "Total Size" | awk '{print $3}')
        S3_SIZE_GB=$(echo "scale=2; $S3_SIZE / 1024 / 1024 / 1024" | bc 2>/dev/null || echo "1")
    else
        S3_SIZE_GB=1
    fi

    # Data Transfer (estimativa mensal)
    # Nota: Isso é difícil de calcular em tempo real, usamos estimativa
    DATA_TRANSFER_GB=5

    echo ""
    echo "Recursos detectados:"
    echo "  Instance Type: $INSTANCE_TYPE"
    echo "  EBS Volume: ${VOLUME_SIZE} GB"
    echo "  S3 Backups: ${S3_SIZE_GB} GB"
    echo "  Data Transfer (estimado): ${DATA_TRANSFER_GB} GB/mês"
    echo ""
else
    log_info "Instância EC2 não detectada. Usando valores padrão."
    INSTANCE_TYPE="t2.micro"
    VOLUME_SIZE=20
    S3_SIZE_GB=1
    DATA_TRANSFER_GB=5
    echo ""
fi

# ============================================================================
# Calcular custos
# ============================================================================
log_section "CALCULANDO CUSTOS MENSAIS"

echo ""

# Preços AWS (região us-east-1)
# Fonte: https://aws.amazon.com/ec2/pricing/
EC2_T2_MICRO_HOUR=0.0116
EC2_T3_MICRO_HOUR=0.0104
EC2_T3_SMALL_HOUR=0.0208

EBS_GP3_GB=0.08
EBS_GP2_GB=0.10

S3_STANDARD_GB=0.023
S3_STANDARD_IA_GB=0.0125

DATA_TRANSFER_GB_PRICE=0.09

# Calcular horas por mês
HOURS_PER_MONTH=730

# 1. EC2 Compute
if [ "$INSTANCE_TYPE" = "t2.micro" ]; then
    EC2_COST_FREE_TIER=0
    EC2_COST_PAID=$(echo "scale=2; $EC2_T2_MICRO_HOUR * $HOURS_PER_MONTH" | bc)
elif [ "$INSTANCE_TYPE" = "t3.micro" ]; then
    EC2_COST_FREE_TIER=0
    EC2_COST_PAID=$(echo "scale=2; $EC2_T3_MICRO_HOUR * $HOURS_PER_MONTH" | bc)
elif [ "$INSTANCE_TYPE" = "t3.small" ]; then
    EC2_COST_FREE_TIER=$(echo "scale=2; $EC2_T3_SMALL_HOUR * $HOURS_PER_MONTH" | bc)
    EC2_COST_PAID=$EC2_COST_FREE_TIER
else
    EC2_COST_FREE_TIER=0
    EC2_COST_PAID=10.00  # Estimativa
fi

# 2. EBS Storage
if [ $VOLUME_SIZE -le 30 ]; then
    EBS_COST_FREE_TIER=0
    EBS_COST_PAID=$(echo "scale=2; $VOLUME_SIZE * $EBS_GP3_GB" | bc)
else
    EBS_FREE=30
    EBS_PAID=$(echo "$VOLUME_SIZE - $EBS_FREE" | bc)
    EBS_COST_FREE_TIER=$(echo "scale=2; $EBS_PAID * $EBS_GP3_GB" | bc)
    EBS_COST_PAID=$(echo "scale=2; $VOLUME_SIZE * $EBS_GP3_GB" | bc)
fi

# 3. S3 Storage
if [ $(echo "$S3_SIZE_GB <= 5" | bc) -eq 1 ]; then
    S3_COST_FREE_TIER=0
    S3_COST_PAID=$(echo "scale=2; $S3_SIZE_GB * $S3_STANDARD_IA_GB" | bc)
else
    S3_FREE=5
    S3_PAID=$(echo "$S3_SIZE_GB - $S3_FREE" | bc)
    S3_COST_FREE_TIER=$(echo "scale=2; $S3_PAID * $S3_STANDARD_IA_GB" | bc)
    S3_COST_PAID=$(echo "scale=2; $S3_SIZE_GB * $S3_STANDARD_IA_GB" | bc)
fi

# 4. Data Transfer
if [ $(echo "$DATA_TRANSFER_GB <= 15" | bc) -eq 1 ]; then
    DATA_TRANSFER_COST_FREE_TIER=0
    DATA_TRANSFER_COST_PAID=$(echo "scale=2; $DATA_TRANSFER_GB * $DATA_TRANSFER_GB_PRICE" | bc)
else
    DATA_TRANSFER_FREE=15
    DATA_TRANSFER_PAID=$(echo "$DATA_TRANSFER_GB - $DATA_TRANSFER_FREE" | bc)
    DATA_TRANSFER_COST_FREE_TIER=$(echo "scale=2; $DATA_TRANSFER_PAID * $DATA_TRANSFER_GB_PRICE" | bc)
    DATA_TRANSFER_COST_PAID=$(echo "scale=2; $DATA_TRANSFER_GB * $DATA_TRANSFER_GB_PRICE" | bc)
fi

# 5. CloudWatch (Always Free)
CLOUDWATCH_COST_FREE_TIER=0
CLOUDWATCH_COST_PAID=0

# 6. Elastic IP (free quando attached)
EIP_COST=0

# Total
TOTAL_COST_FREE_TIER=$(echo "scale=2; $EC2_COST_FREE_TIER + $EBS_COST_FREE_TIER + $S3_COST_FREE_TIER + $DATA_TRANSFER_COST_FREE_TIER + $CLOUDWATCH_COST_FREE_TIER + $EIP_COST" | bc)
TOTAL_COST_PAID=$(echo "scale=2; $EC2_COST_PAID + $EBS_COST_PAID + $S3_COST_PAID + $DATA_TRANSFER_COST_PAID + $CLOUDWATCH_COST_PAID + $EIP_COST" | bc)

# ============================================================================
# Exibir resultados
# ============================================================================

# Função para formatar moeda
format_cost() {
    printf "\$%.2f" $1
}

# Determinar custo atual
if [ "$IS_FREE_TIER" = true ]; then
    CURRENT_COST=$TOTAL_COST_FREE_TIER
    FUTURE_COST=$TOTAL_COST_PAID
else
    CURRENT_COST=$TOTAL_COST_PAID
    FUTURE_COST=$TOTAL_COST_PAID
fi

echo ""
echo "╔═════════════════════════════════════════════════════════════════╗"
echo "║                    ESTIMATIVA DE CUSTOS AWS                     ║"
echo "╠═════════════════════════════════════════════════════════════════╣"
echo "║                                                                 ║"

if [ "$IS_FREE_TIER" = true ]; then
    printf "║  Status: %-51s ║\n" "FREE TIER ATIVO (12 meses)"
else
    printf "║  Status: %-51s ║\n" "FREE TIER EXPIRADO"
fi

echo "║                                                                 ║"
echo "╠═════════════════════════════════════════════════════════════════╣"
echo "║  Recurso              │  Free Tier  │  Após Free Tier          ║"
echo "╠═════════════════════════════════════════════════════════════════╣"

printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "EC2 $INSTANCE_TYPE" "0.00" "$(printf '%.2f' $EC2_COST_PAID)/mês"
printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "EBS ${VOLUME_SIZE}GB gp3" "0.00" "$(printf '%.2f' $EBS_COST_PAID)/mês"
printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "S3 ${S3_SIZE_GB}GB backups" "0.00" "$(printf '%.2f' $S3_COST_PAID)/mês"
printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "Data Transfer ${DATA_TRANSFER_GB}GB" "0.00" "$(printf '%.2f' $DATA_TRANSFER_COST_PAID)/mês"
printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "CloudWatch" "0.00" "0.00/mês (Always Free)"
printf "║  %-20s │  \$%-9s │  \$%-23s ║\n" "Elastic IP" "0.00" "0.00/mês (attached)"

echo "╠═════════════════════════════════════════════════════════════════╣"

if [ "$IS_FREE_TIER" = true ]; then
    printf "║  %-20s │  \033[1;32m\$%-9s\033[0m │  \$%-23s ║\n" "TOTAL MENSAL" "$(printf '%.2f' $TOTAL_COST_FREE_TIER)" "$(printf '%.2f' $TOTAL_COST_PAID)/mês"
    printf "║  %-20s │  \033[1;32m\$%-9s\033[0m │  \$%-23s ║\n" "TOTAL ANUAL" "$(printf '%.2f' $(echo "$TOTAL_COST_FREE_TIER * 12" | bc))" "$(printf '%.2f' $(echo "$TOTAL_COST_PAID * 12" | bc))/ano"
else
    printf "║  %-20s │             │  \033[1;33m\$%-23s\033[0m ║\n" "TOTAL MENSAL" "$(printf '%.2f' $TOTAL_COST_PAID)/mês"
    printf "║  %-20s │             │  \033[1;33m\$%-23s\033[0m ║\n" "TOTAL ANUAL" "$(printf '%.2f' $(echo "$TOTAL_COST_PAID * 12" | bc))/ano"
fi

echo "╚═════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Comparações
# ============================================================================
log_section "COMPARAÇÃO COM ALTERNATIVAS"

echo ""
echo "┌─────────────────────────────────────────────────────────────────┐"
echo "│ Solução                │  Custo Ano 1  │  Custo Ano 2+          │"
echo "├─────────────────────────────────────────────────────────────────┤"
printf "│ %-22s │  \033[1;32m\$%-11s\033[0m │  \$%-21s │\n" "EC2 Free Tier (atual)" "0/mês" "$(printf '%.2f' $TOTAL_COST_PAID)/mês"
echo "│ Lightsail \$5           │  \$5/mês       │  \$5/mês                │"
echo "│ ECS Fargate + RDS      │  \$110-147/mês │  \$110-147/mês          │"
echo "│ Lambda + Aurora        │  \$43+/mês     │  \$43+/mês              │"
echo "└─────────────────────────────────────────────────────────────────┘"
echo ""

# ============================================================================
# Recomendações
# ============================================================================
log_section "RECOMENDAÇÕES"

echo ""

if [ "$IS_FREE_TIER" = true ]; then
    echo "✓ Você está no Free Tier! Custo atual: \$0/mês"
    echo ""
    echo "Dicas para maximizar o Free Tier:"
    echo "  • Mantenha apenas 1 instância t2.micro ou t3.micro rodando"
    echo "  • Monitore data transfer (limite: 15 GB/mês)"
    echo "  • Backups no S3: mantenha < 5 GB"
    echo "  • Configure Budget Alerts para \$1-2/mês (segurança)"
    echo ""
    echo "Quando o Free Tier expirar (após 12 meses):"
    ANNUAL_COST=$(echo "scale=2; $TOTAL_COST_PAID * 12" | bc)
    echo "  • Custo estimado: \$$(printf '%.2f' $TOTAL_COST_PAID)/mês ou \$$(printf '%.2f' $ANNUAL_COST)/ano"
else
    echo "Você está fora do Free Tier."
    echo "Custo mensal estimado: \$$(printf '%.2f' $TOTAL_COST_PAID)"
    echo ""

    # Verificar se pode otimizar
    if [ "$INSTANCE_TYPE" != "t2.micro" ] && [ "$INSTANCE_TYPE" != "t3.micro" ]; then
        echo "💡 OTIMIZAÇÃO SUGERIDA:"
        echo "  • Seu instance type é $INSTANCE_TYPE"
        echo "  • Considere downgrade para t2.micro ou t3.micro"
        echo "  • Economia potencial: ~\$5-10/mês"
    fi

    if [ $(echo "$VOLUME_SIZE > 30" | bc) -eq 1 ]; then
        EXCESS=$(echo "$VOLUME_SIZE - 30" | bc)
        echo ""
        echo "💡 OTIMIZAÇÃO SUGERIDA:"
        echo "  • Volume EBS: ${VOLUME_SIZE}GB (${EXCESS}GB acima do ideal)"
        echo "  • Considere limpar Docker: docker system prune -a"
        echo "  • Economia potencial: ~\$$(echo "scale=2; $EXCESS * $EBS_GP3_GB" | bc)/mês"
    fi

    if [ $(echo "$S3_SIZE_GB > 5" | bc) -eq 1 ]; then
        EXCESS=$(echo "$S3_SIZE_GB - 5" | bc)
        echo ""
        echo "💡 OTIMIZAÇÃO SUGERIDA:"
        echo "  • S3 backups: ${S3_SIZE_GB}GB (${EXCESS}GB excesso)"
        echo "  • Ajuste política de retenção de backups"
        echo "  • Economia potencial: ~\$$(echo "scale=2; $EXCESS * $S3_STANDARD_IA_GB" | bc)/mês"
    fi
fi

echo ""

# ============================================================================
# Budget Alert (sugestão)
# ============================================================================
log_section "CONFIGURAR ALERTA DE ORÇAMENTO"

echo ""
echo "É altamente recomendado configurar um Budget Alert para evitar"
echo "surpresas na fatura AWS."
echo ""
echo "Para criar um Budget Alert de \$5/mês:"
echo ""
echo "1. Acesse: https://console.aws.amazon.com/billing/home#/budgets"
echo "2. Clique em 'Create budget'"
echo "3. Selecione 'Cost budget'"
echo "4. Configure:"
echo "   - Budget name: SmartFinance-Monthly"
echo "   - Period: Monthly"
echo "   - Budgeted amount: \$5"
echo "   - Alert threshold: 80% (\$4)"
echo "   - Email: seu-email@example.com"
echo ""
echo "Ou execute via CLI:"
echo ""
cat << 'BUDGET_EXAMPLE'
cat > budget.json << 'EOF'
{
  "BudgetLimit": {
    "Amount": "5",
    "Unit": "USD"
  },
  "BudgetName": "SmartFinance-Monthly",
  "BudgetType": "COST",
  "CostFilters": {},
  "TimeUnit": "MONTHLY"
}
EOF

aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json \
  --notifications-with-subscribers \
    '[{
      "Notification": {
        "ComparisonOperator": "GREATER_THAN",
        "NotificationType": "ACTUAL",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [{
        "Address": "seu-email@example.com",
        "SubscriptionType": "EMAIL"
      }]
    }]'
BUDGET_EXAMPLE

echo ""

# ============================================================================
# Salvar relatório
# ============================================================================
log_section "SALVANDO RELATÓRIO"

REPORT_FILE="cost-estimate-$(date +%Y%m%d).txt"

cat > "$REPORT_FILE" << EOF
SmartFinance - AWS Cost Estimate Report
========================================
Generated: $(date)

Account ID: $ACCOUNT_ID
Free Tier Status: $([ "$IS_FREE_TIER" = true ] && echo "ACTIVE" || echo "EXPIRED")

Resources:
----------
Instance Type: $INSTANCE_TYPE
EBS Volume: ${VOLUME_SIZE} GB
S3 Backups: ${S3_SIZE_GB} GB
Data Transfer: ${DATA_TRANSFER_GB} GB/month

Monthly Costs:
--------------
$([ "$IS_FREE_TIER" = true ] && echo "With Free Tier: \$$(printf '%.2f' $TOTAL_COST_FREE_TIER)/month" || echo "")
Without Free Tier: \$$(printf '%.2f' $TOTAL_COST_PAID)/month

Annual Costs:
-------------
$([ "$IS_FREE_TIER" = true ] && echo "With Free Tier: \$$(echo "scale=2; $TOTAL_COST_FREE_TIER * 12" | bc)/year" || echo "")
Without Free Tier: \$$(echo "scale=2; $TOTAL_COST_PAID * 12" | bc)/year

Breakdown:
----------
EC2 $INSTANCE_TYPE: \$$(printf '%.2f' $EC2_COST_PAID)/month
EBS ${VOLUME_SIZE}GB: \$$(printf '%.2f' $EBS_COST_PAID)/month
S3 ${S3_SIZE_GB}GB: \$$(printf '%.2f' $S3_COST_PAID)/month
Data Transfer: \$$(printf '%.2f' $DATA_TRANSFER_COST_PAID)/month
CloudWatch: \$0.00/month (Always Free)
Elastic IP: \$0.00/month (attached)

Comparison:
-----------
EC2 Free Tier (current): \$0/month (Year 1), \$$(printf '%.2f' $TOTAL_COST_PAID)/month (Year 2+)
Lightsail \$5: \$5/month
ECS Fargate + RDS: \$110-147/month
Lambda + Aurora: \$43+/month

Recommendations:
----------------
$([ "$IS_FREE_TIER" = true ] && echo "✓ You are in Free Tier! Cost: \$0/month" || echo "✗ Free Tier expired. Consider optimizations.")
EOF

echo ""
log_info "Relatório salvo em: $REPORT_FILE"
echo ""

log_section "FIM DO RELATÓRIO"
echo ""
