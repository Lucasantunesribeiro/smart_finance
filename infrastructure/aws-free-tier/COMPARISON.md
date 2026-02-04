# SmartFinance - Comparação de Arquiteturas AWS

Análise comparativa detalhada entre diferentes arquiteturas de deployment para o SmartFinance.

## Resumo Executivo

| Arquitetura | Custo Ano 1 | Custo Ano 2+ | RAM | vCPU | Escalabilidade | Complexidade | Recomendado Para |
|-------------|-------------|--------------|-----|------|----------------|--------------|------------------|
| **EC2 Free Tier** | **$0** | **$9/mês** | 1 GB | 1 | Baixa | Baixa | Prototipagem, MVP, baixo tráfego |
| **Lightsail $5** | $5/mês | $5/mês | 512 MB | 1 | Baixa | Muito Baixa | Projetos pessoais, demos |
| **Lightsail $10** | $10/mês | $10/mês | 1 GB | 1 | Baixa | Muito Baixa | Pequenas startups |
| **EC2 + RDS** | $0 | $24/mês | 2 GB | 2 | Média | Média | Produção pequena |
| **ECS Fargate** | $110/mês | $110/mês | 2 GB | 1 | Alta | Alta | Produção média/alta |
| **Lambda + Aurora** | $43/mês | $43/mês | N/A | N/A | Muito Alta | Muito Alta | Alta escala, serverless |

---

## 1. EC2 t2.micro Free Tier (Recomendada) ⭐

### Especificações

```
Compute:    EC2 t2.micro (1 vCPU, 1 GB RAM)
Database:   PostgreSQL 15 em Docker
Storage:    20 GB EBS gp3
Network:    Elastic IP + 15 GB transfer/mês
Backup:     S3 (5 GB)
Monitor:    CloudWatch (10 métricas)
```

### Custos Detalhados

#### Ano 1 (Free Tier)
| Item | Quantidade | Preço Unit. | Subtotal | Free Tier | **Total** |
|------|------------|-------------|----------|-----------|-----------|
| EC2 t2.micro | 730h/mês | $0.0116/h | $8.47 | -$8.47 | **$0.00** |
| EBS gp3 | 20 GB | $0.08/GB | $1.60 | -$1.60 | **$0.00** |
| S3 storage | 1.1 GB | $0.023/GB | $0.03 | -$0.03 | **$0.00** |
| Data Transfer | 5 GB | $0.09/GB | $0.45 | -$0.45 | **$0.00** |
| CloudWatch | 6 métricas | $0.30/métrica | $1.80 | -$1.80 | **$0.00** |
| Elastic IP | 1 (attached) | $0.00 | $0.00 | $0.00 | **$0.00** |
| **TOTAL MÊS** | | | **$12.35** | **-$12.35** | **$0.00** ✅ |
| **TOTAL ANO** | | | **$148.20** | **-$148.20** | **$0.00** ✅ |

#### Ano 2+ (Pós Free Tier)
| Item | Quantidade | Preço Unit. | **Total** |
|------|------------|-------------|-----------|
| EC2 t2.micro | 730h/mês | $0.0116/h | **$8.47** |
| EBS gp3 | 20 GB | $0.08/GB | **$1.60** |
| S3 storage | 1.1 GB | $0.023/GB | **$0.03** |
| Data Transfer | 5 GB | $0.09/GB | **$0.45** |
| CloudWatch | 6 métricas | Always Free | **$0.00** |
| Elastic IP | 1 (attached) | $0.00 | **$0.00** |
| **TOTAL MÊS** | | | **$10.55** |
| **TOTAL ANO** | | | **$126.60** |

### Prós
- ✅ **Custo ZERO no primeiro ano**
- ✅ **Controle total**: SSH, root access, customização completa
- ✅ **Simplicidade**: Docker Compose, fácil debug
- ✅ **Backup S3 incluído**: Automatizado, seguro
- ✅ **Monitoramento incluído**: CloudWatch + alertas email
- ✅ **SSL gratuito**: Let's Encrypt automático
- ✅ **Escalabilidade vertical**: Fácil upgrade para t3.small/medium

### Contras
- ⚠️ **RAM limitada**: 1 GB (suficiente para 50-100 usuários simultâneos)
- ⚠️ **Single point of failure**: 1 instância, sem redundância
- ⚠️ **Manutenção manual**: Updates, patches, segurança
- ⚠️ **Sem auto-scaling**: Precisa upgrade manual se crescer
- ⚠️ **Custo sobe após 12 meses**: ~$10/mês (ainda barato)

### Performance Esperada

| Métrica | Valor | Notas |
|---------|-------|-------|
| **Concurrent Users** | 50-100 | Sem degradação |
| **API Response Time** | 200-500ms | 95th percentile |
| **Page Load Time** | 2-4s | First load (SSR) |
| **Database Queries** | 50-100ms | Queries simples |
| **Uptime** | 99%+ | ~7h downtime/ano |
| **Data Transfer** | 15 GB/mês | Free Tier limit |

### Quando Usar
- ✅ MVP ou prototipagem
- ✅ Aplicação pessoal ou portfólio
- ✅ Baixo tráfego (< 100 usuários/dia)
- ✅ Budget limitado ($0-10/mês)
- ✅ Aprender DevOps/Cloud

### Quando NÃO Usar
- ❌ Alta disponibilidade crítica (99.9%+)
- ❌ Tráfego alto (> 500 usuários simultâneos)
- ❌ Compliance rigoroso (HIPAA, PCI-DSS)
- ❌ Múltiplas regiões/CDN global

---

## 2. AWS Lightsail $5/mês

### Especificações

```
Compute:    1 vCPU, 512 MB RAM
Storage:    20 GB SSD
Transfer:   1 TB/mês
Database:   PostgreSQL em container
Backup:     Snapshots ($0.05/GB/mês)
```

### Custos

| Item | Preço |
|------|-------|
| Lightsail $5 plan | $5.00/mês |
| Snapshot (20 GB) | $1.00/mês (opcional) |
| **TOTAL** | **$5-6/mês** |
| **TOTAL ANO** | **$60-72/ano** |

### Prós
- ✅ **Preço fixo previsível**: $5/mês sempre
- ✅ **Setup extremamente simples**: 1-click deploy
- ✅ **1 TB transfer incluído**: 66x mais que EC2 Free Tier
- ✅ **Interface amigável**: Console simplificado
- ✅ **Snapshots fáceis**: Backup com 1 clique

### Contras
- ⚠️ **Apenas 512 MB RAM**: Metade do EC2 t2.micro
- ⚠️ **Sem Free Tier**: Paga desde o dia 1
- ⚠️ **Escalabilidade limitada**: Máximo 32 GB RAM
- ⚠️ **Menos flexível**: Sem controle fino sobre recursos
- ⚠️ **Snapshots pagos**: $1/mês extra

### Comparação EC2 Free Tier vs Lightsail $5

| Aspecto | EC2 Free Tier | Lightsail $5 | Vencedor |
|---------|---------------|--------------|----------|
| **Custo Ano 1** | $0 | $60 | ✅ EC2 |
| **Custo Ano 2+** | $126 | $60 | ✅ Lightsail |
| **RAM** | 1 GB | 512 MB | ✅ EC2 |
| **Data Transfer** | 15 GB | 1 TB | ✅ Lightsail |
| **Complexidade** | Média | Baixa | ✅ Lightsail |
| **Controle** | Total | Limitado | ✅ EC2 |
| **Escalabilidade** | Alta | Média | ✅ EC2 |

**Recomendação:**
- Use **EC2 Free Tier** se: Quer $0 no primeiro ano, mais RAM, controle total
- Use **Lightsail $5** se: Quer simplicidade máxima, preço fixo, muito data transfer

---

## 3. EC2 t3.micro + RDS db.t3.micro

### Especificações

```
Compute:    EC2 t3.micro (2 vCPU, 1 GB RAM)
Database:   RDS db.t3.micro PostgreSQL (1 vCPU, 1 GB RAM, 20 GB)
Storage:    20 GB EBS gp3 (EC2) + 20 GB (RDS)
Network:    Elastic IP
Backup:     RDS automated backups (7 dias, gratuito)
```

### Custos

#### Ano 1 (Partial Free Tier)
| Item | Preço | Free Tier | Total |
|------|-------|-----------|-------|
| EC2 t3.micro | $7.59/mês | -$7.59 | $0.00 |
| RDS db.t3.micro | $15.33/mês | -$15.33 | $0.00 |
| EBS (EC2) | $1.60/mês | -$1.60 | $0.00 |
| EBS (RDS) | $2.30/mês | $0.00 | $2.30 |
| Data Transfer | $0.45/mês | -$0.45 | $0.00 |
| **TOTAL MÊS** | **$27.27** | **-$24.97** | **$2.30** ✅ |

#### Ano 2+
| Item | Preço |
|------|-------|
| EC2 t3.micro | $7.59/mês |
| RDS db.t3.micro | $15.33/mês |
| EBS total | $3.90/mês |
| Data Transfer | $0.45/mês |
| **TOTAL MÊS** | **$27.27** |

### Prós
- ✅ **Mais RAM**: 2 GB total (EC2 + RDS)
- ✅ **Database gerenciado**: Backups, patches, monitoramento automático
- ✅ **Multi-AZ opcional**: Alta disponibilidade fácil (+100% custo)
- ✅ **Melhor performance**: Database dedicado, sem competição por recursos
- ✅ **Escalabilidade**: Fácil upgrade RDS sem downtime

### Contras
- ⚠️ **Custo 3x maior**: $27/mês vs $9/mês (EC2 Free Tier após 12 meses)
- ⚠️ **Complexidade maior**: VPC, Security Groups, subnet groups
- ⚠️ **Overkill para baixo tráfego**: Recursos sub-utilizados
- ⚠️ **RDS caro**: Database gerenciado tem premium alto

### Quando Usar
- ✅ Produção com SLA > 99%
- ✅ Tráfego médio (100-500 usuários simultâneos)
- ✅ Budget $25-50/mês
- ✅ Precisa Multi-AZ ou read replicas

---

## 4. ECS Fargate + ALB + RDS (Arquitetura Anterior)

### Especificações

```
Compute:    ECS Fargate (0.25 vCPU, 512 MB RAM × 3 tasks)
Load Bal:   Application Load Balancer
Database:   RDS db.t3.micro PostgreSQL
Storage:    20 GB (RDS) + EFS (opcional)
Network:    NAT Gateway + VPC
```

### Custos (Calculado Real)

| Item | Quantidade | Preço | Total |
|------|------------|-------|-------|
| **ECS Fargate Tasks** | 3 tasks × 730h | | |
| - vCPU (0.25 × 3) | 547.5 vCPU-hours | $0.04048/h | $22.16 |
| - Memory (512 MB × 3) | 1,095 GB-hours | $0.004445/h | $4.87 |
| **Application Load Balancer** | 730h | $0.0225/h | $16.43 |
| **RDS db.t3.micro** | 730h | $0.021/h | $15.33 |
| **RDS Storage 20 GB** | 20 GB | $0.115/GB | $2.30 |
| **NAT Gateway** | 730h + 50 GB | $0.045/h + $0.045/GB | $35.10 |
| **Data Transfer** | 10 GB | $0.09/GB | $0.90 |
| **CloudWatch Logs** | 5 GB | $0.50/GB | $2.50 |
| **ECR Storage** | 2 GB | $0.10/GB | $0.20 |
| **TOTAL MÊS** | | | **$99.79** |
| **TOTAL ANO** | | | **$1,197.48** |

### Custos Observados (Reais)

Baseado nos screenshots do usuário:
- **Janeiro 2025**: $147.34
- **Dezembro 2024**: $110.91
- **Média**: ~$129/mês

**Breakdown dos custos altos:**
- ALB: ~$16/mês (obrigatório para HTTPS/health checks)
- NAT Gateway: ~$35/mês (maior custo individual!)
- ECS Fargate: ~$27/mês (3 tasks 24/7)
- RDS: ~$18/mês
- Outros: ~$33/mês (logs, storage, transfer)

### Prós
- ✅ **Auto-scaling**: Scale out automático baseado em métricas
- ✅ **Alta disponibilidade**: Multi-AZ, health checks, auto-recovery
- ✅ **Serverless containers**: Sem gestão de servers
- ✅ **Load balancing**: ALB com SSL/TLS termination
- ✅ **Enterprise-ready**: Seguro, compliant, auditável

### Contras
- ❌ **MUITO CARO**: $110-147/mês (11-16x o EC2 Free Tier)
- ❌ **Complexidade alta**: VPC, subnets, task definitions, IAM
- ❌ **Over-engineered**: Para uma aplicação simples
- ❌ **NAT Gateway**: Custo fixo alto ($35/mês) inevitável
- ❌ **Difícil debug**: Logs distribuídos, ephemeral containers

### Quando Usar
- ✅ Produção enterprise com alto tráfego
- ✅ Precisa auto-scaling horizontal
- ✅ Budget > $100/mês
- ✅ Múltiplas aplicações/microserviços
- ✅ Compliance rigoroso

### Quando NÃO Usar
- ❌ MVP ou prototipagem
- ❌ Budget limitado (< $50/mês)
- ❌ Aplicação monolítica simples
- ❌ Baixo tráfego

---

## 5. Lambda + API Gateway + Aurora Serverless v2

### Especificações

```
Compute:    Lambda (Node.js 18, 1 GB RAM)
API:        API Gateway REST
Database:   Aurora Serverless v2 PostgreSQL (0.5 ACU min)
Storage:    S3 (static assets)
CDN:        CloudFront
```

### Custos Estimados

| Item | Quantidade | Preço | Total |
|------|------------|-------|-------|
| **Lambda** | 1M requests, 1 GB, 500ms avg | | |
| - Requests | 1M | $0.20/1M | $0.20 |
| - Compute | 500k GB-seconds | $0.0000166667/GB-s | $8.33 |
| **API Gateway** | 1M requests | $3.50/1M | $3.50 |
| **Aurora Serverless v2** | 0.5 ACU × 730h | $0.12/ACU-hour | $43.80 |
| **S3 Storage** | 5 GB | $0.023/GB | $0.12 |
| **CloudFront** | 100 GB transfer | $0.085/GB | $8.50 |
| **TOTAL MÊS** | | | **$64.45** |

**Nota:** Aurora Serverless v2 mínimo é 0.5 ACU, custando ~$44/mês sozinho.

### Prós
- ✅ **Auto-scaling extremo**: 0 → milhões de requests
- ✅ **Pay per use**: Não paga quando não usa (exceto Aurora)
- ✅ **Sem gestão de servers**: Totalmente serverless
- ✅ **Alta disponibilidade**: Built-in multi-AZ
- ✅ **Global scale**: CloudFront em 450+ edge locations

### Contras
- ❌ **Aurora caro**: Mínimo $44/mês (não pode desligar)
- ❌ **Cold starts**: 1-3s de latência inicial
- ❌ **Complexidade muito alta**: Refatorar app inteira
- ❌ **Vendor lock-in**: Difícil migrar de Lambda
- ❌ **Debugging difícil**: Distributed tracing, logs fragmentados
- ❌ **Limites Lambda**: 15 min timeout, 10 GB RAM max

### Quando Usar
- ✅ Tráfego extremamente variável (0 → 10k users)
- ✅ Aplicação já arquitetada para serverless
- ✅ Múltiplas regiões globais
- ✅ Budget elástico ($50-500/mês dependendo do tráfego)

### Quando NÃO Usar
- ❌ Aplicação monolítica (Next.js SSR, long-running tasks)
- ❌ Budget limitado fixo
- ❌ Precisa controle fino sobre infraestrutura
- ❌ Tráfego constante (Lambda não economiza)

---

## Comparação Lado a Lado

### Custos (12 meses)

| Arquitetura | Mês 1-12 | Ano 2+ | Total 2 Anos |
|-------------|----------|--------|--------------|
| **EC2 Free Tier** | $0 | $127 | **$127** ✅ |
| **Lightsail $5** | $60 | $60 | **$120** ✅ |
| **Lightsail $10** | $120 | $120 | **$240** |
| **EC2 + RDS** | $28 | $327 | **$355** |
| **ECS Fargate** | $1,197 | $1,197 | **$2,394** ❌ |
| **Lambda + Aurora** | $774 | $774 | **$1,548** ❌ |

### Performance

| Métrica | EC2 Free | Lightsail $5 | EC2+RDS | ECS | Lambda |
|---------|----------|--------------|---------|-----|--------|
| **Concurrent Users** | 50-100 | 30-50 | 100-300 | 500+ | 10k+ |
| **Response Time** | 200-500ms | 300-600ms | 100-300ms | 100-200ms | 50-3000ms* |
| **Uptime** | 99%+ | 99%+ | 99.5%+ | 99.9%+ | 99.95%+ |
| **Auto-scale** | ❌ | ❌ | ❌ | ✅ | ✅ |

*Lambda: 50ms warm, 1-3s cold start

### Escalabilidade

```
EC2 Free Tier:       [0 ──────── 100 users] ──┐
                                                ├─► Manual upgrade
Lightsail $5:        [0 ──── 50 users] ────────┘

EC2 + RDS:           [0 ────────── 300 users] ──┐
                                                  ├─► Upgrade instance size
Lightsail $10:       [0 ────── 100 users] ───────┘

ECS Fargate:         [0 ═══════════════════════ 10k+ users] ──► Auto-scale

Lambda:              [0 ═════════════════════════════ ∞ ] ──► Unlimited*
                     (*subject to AWS account limits)
```

### Complexidade de Setup

```
Lightsail $5:        ▓░░░░ (1/5) - 30 min
EC2 Free Tier:       ▓▓░░░ (2/5) - 2 horas (com scripts)
EC2 + RDS:           ▓▓▓░░ (3/5) - 4 horas
ECS Fargate:         ▓▓▓▓░ (4/5) - 8+ horas
Lambda + Aurora:     ▓▓▓▓▓ (5/5) - 16+ horas (refactor completo)
```

---

## Recomendação por Caso de Uso

### 1. MVP / Prototipagem / Aprendizado
**Escolha: EC2 Free Tier** ⭐
- **Por quê:** $0 custo, controle total, fácil debug
- **Migração:** Lightsail ou EC2+RDS quando crescer

### 2. Projeto Pessoal / Portfólio
**Escolha: Lightsail $5 ou EC2 Free Tier**
- **Lightsail:** Se quer simplicidade máxima
- **EC2:** Se quer economizar no primeiro ano

### 3. Pequena Startup (< 500 usuários)
**Escolha: EC2 t3.small + RDS db.t3.micro**
- **Custo:** ~$50/mês
- **Specs:** 2 GB RAM (EC2) + 1 GB (RDS)
- **Migração:** ECS Fargate quando passar 1k usuários

### 4. Produção Média (500-5k usuários)
**Escolha: ECS Fargate + ALB + RDS Multi-AZ**
- **Custo:** $150-300/mês
- **High Availability:** Multi-AZ, auto-scaling
- **Migração:** Lambda/containers se crescer muito

### 5. Alta Escala (5k+ usuários, global)
**Escolha: ECS Fargate + Aurora + CloudFront**
- **Custo:** $300-1000+/mês
- **Global:** Multi-region, CDN
- **Ou:** Lambda + Aurora se tráfego muito variável

---

## Calculadora de Decisão

```python
def escolher_arquitetura(usuarios_dia, budget_mensal, experiencia_devops):
    if budget_mensal == 0:
        return "EC2 Free Tier"

    if budget_mensal < 10:
        if usuarios_dia < 50:
            return "Lightsail $5"
        else:
            return "EC2 Free Tier (upgrade para t3.small depois)"

    if budget_mensal < 30:
        if usuarios_dia < 100:
            return "Lightsail $10"
        else:
            return "EC2 t3.small + PostgreSQL Docker"

    if budget_mensal < 60:
        if experiencia_devops == "baixa":
            return "Lightsail $20"
        else:
            return "EC2 t3.small + RDS db.t3.micro"

    if budget_mensal < 150:
        return "EC2 t3.medium + RDS db.t3.small Multi-AZ"

    # Budget > $150
    if usuarios_dia < 5000:
        return "ECS Fargate + RDS Multi-AZ"
    else:
        return "ECS Fargate + Aurora Serverless + CloudFront"
```

---

## Conclusão

**Para SmartFinance com Free Tier:**

✅ **RECOMENDADO: EC2 t2.micro Free Tier**

**Razões:**
1. **Custo ZERO** no primeiro ano ($0 vs $60 Lightsail)
2. **Dobro de RAM** (1 GB vs 512 MB Lightsail)
3. **Scripts prontos** (deploy em 2 horas)
4. **Escalável** (upgrade fácil para t3.small)
5. **Aprendizado** (controle total, SSH, Docker)

**Caminho de Evolução:**
```
EC2 Free Tier ($0)
    ↓ Após 12 meses ou crescimento
EC2 t3.small + PostgreSQL ($15/mês)
    ↓ Se precisar database gerenciado
EC2 t3.small + RDS db.t3.micro ($27/mês)
    ↓ Se precisar auto-scaling
ECS Fargate + RDS Multi-AZ ($150/mês)
    ↓ Se precisar global scale
ECS + Aurora + CloudFront ($300+/mês)
```

---

**Documentação criada:** 2026-02-03
