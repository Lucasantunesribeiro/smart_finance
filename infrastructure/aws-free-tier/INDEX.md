# SmartFinance - AWS Free Tier Infrastructure

Documentação completa para deploy do SmartFinance na AWS com **custo ZERO** (ou próximo disso).

---

## 📋 Índice de Documentação

| Documento | Descrição | Tempo Leitura |
|-----------|-----------|---------------|
| **[QUICKSTART.md](QUICKSTART.md)** | Guia rápido de deploy (TL;DR) | 10 min |
| **[README.md](README.md)** | Documentação completa e detalhada | 30 min |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Diagramas e especificações técnicas | 20 min |
| **[COMPARISON.md](COMPARISON.md)** | Comparação entre arquiteturas AWS | 15 min |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Guia de resolução de problemas | Referência |

---

## 🚀 Quick Start (5 comandos)

```bash
cd infrastructure/aws-free-tier

./1-create-ec2.sh          # 15 min - Cria infraestrutura
./2-deploy-application.sh  # 20 min - Deploy da aplicação
./3-setup-ssl.sh domain.com email@example.com  # 15 min - HTTPS (opcional)
./4-setup-backups.sh       # 10 min - Backups automáticos
./5-setup-monitoring.sh    # 10 min - CloudWatch + alertas

# Pronto! Aplicação rodando em http://<ELASTIC_IP>
```

**Tempo total:** ~70 minutos (incluindo esperas)
**Custo:** $0/mês no Free Tier

---

## 📁 Estrutura de Arquivos

```
infrastructure/aws-free-tier/
├── README.md                    # Documentação principal
├── QUICKSTART.md                # Guia rápido de início
├── ARCHITECTURE.md              # Arquitetura detalhada
├── COMPARISON.md                # Comparação de arquiteturas
├── TROUBLESHOOTING.md           # Guia de troubleshooting
├── INDEX.md                     # Este arquivo
│
├── Scripts de Setup (executar em ordem):
│   ├── 1-create-ec2.sh         # Cria EC2 + Elastic IP + Security Group
│   ├── 2-deploy-application.sh # Deploy completo da aplicação
│   ├── 3-setup-ssl.sh          # Configura SSL/HTTPS (Let's Encrypt)
│   ├── 4-setup-backups.sh      # Backups automáticos para S3
│   └── 5-setup-monitoring.sh   # CloudWatch + SNS alertas
│
├── Scripts de Manutenção:
│   ├── optimize-performance.sh # Otimiza performance para t2.micro
│   ├── estimate-costs.sh       # Calcula custos mensais
│   └── cleanup.sh              # Destroi toda infraestrutura
│
└── Arquivos Gerados (após execução):
    ├── .env.ec2                # Variáveis de ambiente (IP, IDs)
    ├── smartfinance-key.pem    # Chave SSH (GUARDAR!)
    ├── ec2-info.txt            # Informações da EC2
    ├── deploy-info.txt         # Informações do deploy
    ├── ssl-info.txt            # Informações SSL (se configurado)
    ├── backup-info.txt         # Informações de backup
    └── monitoring-info.txt     # Informações de monitoramento
```

---

## 💰 Custos

### Ano 1 (Free Tier): $0/mês ✅

| Recurso | Free Tier | Uso | Custo |
|---------|-----------|-----|-------|
| EC2 t2.micro | 750h/mês | 730h | **$0** |
| EBS 20 GB | 30 GB | 20 GB | **$0** |
| S3 Backups | 5 GB | ~1 GB | **$0** |
| Data Transfer | 15 GB out | ~5 GB | **$0** |
| CloudWatch | 10 métricas | 6 | **$0** |
| **TOTAL** | | | **$0** ✅ |

### Ano 2+: ~$9-11/mês

| Recurso | Custo |
|---------|-------|
| EC2 t2.micro | $8.47/mês |
| EBS 20 GB | $1.60/mês |
| S3 Backups | $0.03/mês |
| Data Transfer | $0.45/mês |
| CloudWatch | $0.00/mês (Always Free) |
| **TOTAL** | **$10.55/mês** |

**Economia vs ECS Fargate:** $110-147/mês → $10/mês = **92% de redução**

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│              INTERNET (Usuários)                 │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS/HTTP
                   ▼
┌─────────────────────────────────────────────────┐
│           ELASTIC IP (Free when attached)        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│        EC2 t2.micro (1 vCPU, 1 GB RAM)          │
│  ┌───────────────────────────────────────────┐  │
│  │  NGINX (Reverse Proxy + SSL)              │  │
│  └───────────┬───────────────────────────────┘  │
│              │                                   │
│  ┌───────────┴───────────────────────────────┐  │
│  │  Docker Containers (700 MB total)         │  │
│  │  ┌────────────────────────────────────┐   │  │
│  │  │ Frontend (Next.js)     200 MB      │   │  │
│  │  │ Backend (Node.js)      300 MB      │   │  │
│  │  │ PostgreSQL 15          200 MB      │   │  │
│  │  └────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐    ┌──────────────────┐
│  S3 Bucket   │    │   CloudWatch     │
│  (Backups)   │    │  (Monitoring)    │
│  ~1 GB       │    │  6 métricas      │
│  7d + 4w     │    │  5 alarmes       │
└──────────────┘    └─────────┬────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   SNS → Email    │
                    │    (Alertas)     │
                    └──────────────────┘
```

---

## ⚙️ Especificações Técnicas

### Compute

| Componente | Especificação |
|------------|---------------|
| **Instance Type** | EC2 t2.micro |
| **vCPU** | 1 (burstable, até 2.5 GHz) |
| **RAM** | 1 GB |
| **Storage** | 20 GB EBS gp3 (3000 IOPS) |
| **Network** | Até 2.5 Gbps (burstable) |
| **OS** | Ubuntu 22.04 LTS |

### Application

| Componente | Tecnologia | RAM Limit | CPU Limit |
|------------|------------|-----------|-----------|
| **Frontend** | Next.js 14 + React | 200 MB | 0.3 cores |
| **Backend** | Node.js microservice | 300 MB | 0.4 cores |
| **Database** | PostgreSQL 15 Alpine | 200 MB | 0.3 cores |
| **Reverse Proxy** | Nginx 1.24 | Host | Host |

### Security

- ✅ SSL/TLS 1.2+ (Let's Encrypt)
- ✅ Firewall (UFW + Security Groups)
- ✅ Fail2Ban (proteção SSH)
- ✅ Rate Limiting (Nginx)
- ✅ Secrets em variáveis de ambiente
- ✅ S3 encryption (AES256)
- ✅ Database isolation (Docker network)

### Backup & Recovery

- **Frequência:** Diário às 3h AM UTC
- **Retenção:** 7 backups diários + 4 backups semanais
- **Storage:** S3 com encryption
- **Compressão:** gzip (~70% redução)
- **RTO:** 10-20 minutos (Recovery Time Objective)
- **RPO:** 24 horas (Recovery Point Objective)

### Monitoring

- **Métricas:** CPU, RAM, Disk, App Health (6 custom metrics)
- **Alarmes:** 5 alarmes (disk, memory, app health, EC2 status)
- **Logs:** CloudWatch Logs (5 GB Free Tier)
- **Dashboard:** CloudWatch Dashboard
- **Alertas:** Email via SNS

---

## 📊 Performance Esperada

| Métrica | Valor | Notas |
|---------|-------|-------|
| **Concurrent Users** | 50-100 | Sem degradação significativa |
| **API Response Time** | 200-500ms | 95th percentile |
| **Page Load Time** | 2-4s | First load (SSR) |
| **Database Queries** | 50-100ms | Queries simples |
| **Uptime** | 99%+ | ~7 horas downtime/ano |
| **Data Transfer** | 15 GB/mês | Free Tier limit |

---

## 🔧 Manutenção

### Comandos Diários

```bash
# SSH na instância
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Restart aplicação
docker compose restart
```

### Comandos Semanais

```bash
# Verificar recursos
free -h
df -h
docker stats --no-stream

# Limpar logs antigos
docker compose logs --tail=100
```

### Comandos Mensais

```bash
# Limpar Docker cache
docker system prune -a  # CUIDADO: Remove tudo não usado

# Verificar backups
aws s3 ls s3://<BUCKET>/daily/

# Revisar custos
./estimate-costs.sh
```

---

## 🆘 Troubleshooting Rápido

### Aplicação não responde

```bash
# SSH na instância
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Verificar containers
docker compose ps

# Restart se necessário
docker compose restart

# Ver logs
docker compose logs -f
```

### Out of Memory

```bash
# Verificar RAM
free -h

# Verificar swap
swapon --show

# Se necessário, adicionar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Restart containers
docker compose restart
```

### Disco cheio

```bash
# Verificar uso
df -h

# Limpar Docker
docker system prune -a

# Limpar logs
sudo journalctl --vacuum-time=7d
```

**Para mais troubleshooting:** Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎯 Casos de Uso

### ✅ Quando Usar Esta Arquitetura

- MVP ou prototipagem
- Aplicação pessoal ou portfólio
- Projeto de aprendizado
- Baixo tráfego (< 100 usuários/dia)
- Budget limitado ($0-10/mês)
- Precisa controle total (SSH, customização)

### ❌ Quando NÃO Usar

- Alta disponibilidade crítica (99.9%+)
- Tráfego alto (> 500 usuários simultâneos)
- Compliance rigoroso (HIPAA, PCI-DSS)
- Múltiplas regiões/CDN global
- Precisa auto-scaling automático

---

## 📈 Escalabilidade

### Caminho de Evolução

```
1. EC2 t2.micro Free Tier ($0/mês)
   0-100 usuários simultâneos
   │
   ├─► Após 12 meses ou crescimento:
   │
2. EC2 t3.small ($15/mês)
   100-300 usuários simultâneos
   2 GB RAM, 2 vCPU
   │
   ├─► Se precisar database gerenciado:
   │
3. EC2 t3.small + RDS db.t3.micro ($27/mês)
   100-300 usuários
   Database com backups automáticos
   │
   ├─► Se precisar auto-scaling:
   │
4. ECS Fargate + RDS Multi-AZ ($150/mês)
   500+ usuários simultâneos
   Auto-scaling, alta disponibilidade
   │
   ├─► Se precisar global scale:
   │
5. ECS + Aurora + CloudFront ($300+/mês)
   5k+ usuários simultâneos
   Multi-region, CDN global
```

### Upgrade Simples (t2.micro → t3.small)

```bash
# Parar instância
aws ec2 stop-instances --instance-ids <INSTANCE_ID>

# Mudar tipo
aws ec2 modify-instance-attribute \
  --instance-id <INSTANCE_ID> \
  --instance-type '{"Value": "t3.small"}'

# Iniciar instância
aws ec2 start-instances --instance-ids <INSTANCE_ID>

# Custo: $0 → $15/mês
# Performance: 2x RAM, 2x vCPU
```

---

## 🔐 Segurança

### Checklist de Segurança

- [x] SSH via key pair (não password)
- [x] Security Group restritivo (apenas 22, 80, 443)
- [x] Fail2Ban habilitado (proteção brute force)
- [x] UFW firewall configurado
- [x] SSL/TLS 1.2+ (Let's Encrypt)
- [x] Secrets em .env (não no código)
- [x] S3 encryption (AES256)
- [x] Database em rede privada Docker
- [x] Nginx rate limiting
- [x] Security headers (HSTS, X-Frame-Options, etc)
- [ ] **TODO:** Whitelist IP para SSH (Security Group)
- [ ] **TODO:** AWS WAF (se budget permitir: $5/mês)
- [ ] **TODO:** GuardDuty (detecta ameaças: $4/mês)

---

## 📚 Recursos Adicionais

### Documentação AWS
- [AWS Free Tier](https://aws.amazon.com/free/)
- [EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)

### Ferramentas
- [AWS Calculator](https://calculator.aws/) - Estimar custos
- [AWS Cost Explorer](https://aws.amazon.com/aws-cost-management/aws-cost-explorer/) - Analisar gastos
- [AWS Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/) - Alertas de custo

### Comunidade
- [AWS Reddit](https://www.reddit.com/r/aws/)
- [AWS re:Post](https://repost.aws/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/amazon-web-services)

---

## 🤝 Contribuindo

Encontrou um bug ou tem sugestão de melhoria?

1. Abra uma issue: [GitHub Issues](https://github.com/seu-usuario/smartfinance/issues)
2. Fork o repositório
3. Crie uma branch: `git checkout -b feature/melhoria`
4. Commit: `git commit -m 'Adiciona melhoria X'`
5. Push: `git push origin feature/melhoria`
6. Abra um Pull Request

---

## 📄 Licença

Este projeto é licenciado sob a licença MIT - veja o arquivo [LICENSE](../../LICENSE) para detalhes.

---

## ✨ Créditos

**Arquitetura e Scripts:** Lucas Antunes Ferreira
**Assistência Técnica:** Claude Sonnet 4.5 (Anthropic)
**Data:** 2026-02-03

---

## 📞 Suporte

- **GitHub Issues:** https://github.com/seu-usuario/smartfinance/issues
- **Email:** seu-email@example.com
- **AWS Support:** https://console.aws.amazon.com/support

---

## ⏱️ Histórico de Versões

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0.0 | 2026-02-03 | Versão inicial - Arquitetura AWS Free Tier completa |

---

## 🎉 Conclusão

Parabéns! Você tem agora uma arquitetura AWS Free Tier completa e documentada para o SmartFinance.

**Próximos passos:**
1. Executar scripts de setup (`./1-create-ec2.sh` → `./5-setup-monitoring.sh`)
2. Configurar domínio e SSL (opcional)
3. Monitorar custos e performance
4. Escalar quando necessário

**Lembre-se:**
- **Ano 1:** $0/mês (Free Tier)
- **Ano 2+:** ~$10/mês
- **Economia:** 92% vs ECS Fargate ($110-147/mês)

Boa sorte com seu projeto! 🚀

---

**Documentação criada:** 2026-02-03
**Última atualização:** 2026-02-03
**Versão:** 1.0.0
