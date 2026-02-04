# SmartFinance - AWS Free Tier Deployment Checklist

Use este checklist para acompanhar seu progresso no deploy do SmartFinance na AWS Free Tier.

---

## ✅ Fase 1: Pré-requisitos (15 minutos)

### Conta AWS
- [ ] Criar conta AWS (https://aws.amazon.com)
- [ ] Verificar que Free Tier está ativo (< 12 meses)
- [ ] Anotar Account ID: `___________________________`

### AWS CLI
- [ ] Instalar AWS CLI (`pip install awscli`)
- [ ] Executar `aws configure`
- [ ] Inserir Access Key ID
- [ ] Inserir Secret Access Key
- [ ] Definir região: `us-east-1`
- [ ] Testar: `aws sts get-caller-identity`

### Ferramentas Locais
- [ ] Verificar SSH instalado (`which ssh`)
- [ ] Verificar SCP instalado (`which scp`)
- [ ] Verificar Tar instalado (`which tar`)

### Preparação
- [ ] Clonar/baixar repositório SmartFinance
- [ ] Navegar para `infrastructure/aws-free-tier/`
- [ ] Tornar scripts executáveis (`chmod +x *.sh`)

---

## 🚀 Fase 2: Setup Infraestrutura (70 minutos)

### Script 1: Criar EC2 Instance (15 min)

- [ ] Executar: `./1-create-ec2.sh`
- [ ] Aguardar script completar
- [ ] Anotar Elastic IP: `___________________________`
- [ ] Anotar Instance ID: `___________________________`
- [ ] Verificar arquivo `smartfinance-key.pem` criado
- [ ] **IMPORTANTE:** Fazer backup de `smartfinance-key.pem` ⚠️
- [ ] Aguardar 5 minutos para user-data script
- [ ] Testar SSH: `ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>`
- [ ] Verificar Docker instalado: `docker --version`
- [ ] Verificar swap: `swapon --show` (deve mostrar 2 GB)

**Status:** ⬜ Pendente | ⏳ Em Progresso | ✅ Concluído | ❌ Erro

---

### Script 2: Deploy Aplicação (20 min)

- [ ] Executar: `./2-deploy-application.sh`
- [ ] Aguardar script completar
- [ ] Containers iniciados com sucesso
- [ ] Testar no browser: `http://<ELASTIC_IP>/`
- [ ] Testar backend: `curl http://<ELASTIC_IP>/api/v1/health`
- [ ] Testar Nginx: `curl http://<ELASTIC_IP>/health`
- [ ] Verificar containers: `docker compose ps` (todos "healthy")
- [ ] Verificar logs: `docker compose logs --tail=50` (sem erros)

**Credenciais Demo (se SEED_DEMO_DATA=true):**
- Email: `demo@smartfinance.com`
- Senha: `Demo123!`

**Status:** ⬜ Pendente | ⏳ Em Progresso | ✅ Concluído | ❌ Erro

---

### Script 3: Configurar SSL/HTTPS (15 min, OPCIONAL)

**⚠️ Requer domínio apontando para Elastic IP**

#### Pré-requisitos:
- [ ] Ter domínio registrado
- [ ] Configurar DNS A record:
  - Nome: `___________________________` (seu domínio)
  - Tipo: `A`
  - Valor: `___________________________` (Elastic IP)
- [ ] Aguardar propagação DNS (1-5 min)
- [ ] Testar: `dig +short <SEU_DOMINIO>` → deve retornar Elastic IP

#### Execução:
- [ ] Executar: `./3-setup-ssl.sh <SEU_DOMINIO> <SEU_EMAIL>`
- [ ] Certificado SSL obtido com sucesso
- [ ] Nginx configurado para HTTPS
- [ ] Testar: `curl -I https://<SEU_DOMINIO>`
- [ ] Verificar redirect: `curl -I http://<SEU_DOMINIO>` → deve redirecionar 301
- [ ] Verificar no browser (deve mostrar cadeado 🔒)

**Domínio configurado:** `___________________________`

**Status:** ⬜ Pendente | ⬜ Não Aplicável | ✅ Concluído | ❌ Erro

---

### Script 4: Configurar Backups (10 min)

- [ ] Executar: `./4-setup-backups.sh`
- [ ] S3 bucket criado
- [ ] IAM role configurado
- [ ] Script de backup instalado
- [ ] Cron job configurado (3h AM UTC)
- [ ] Primeiro backup executado com sucesso
- [ ] Anotar S3 Bucket: `___________________________`
- [ ] Testar listar backups: `aws s3 ls s3://<BUCKET>/daily/`
- [ ] Verificar cron: `crontab -l` (via SSH)

**Status:** ⬜ Pendente | ⏳ Em Progresso | ✅ Concluído | ❌ Erro

---

### Script 5: Configurar Monitoramento (10 min)

- [ ] Executar: `./5-setup-monitoring.sh`
- [ ] Inserir email para alertas: `___________________________`
- [ ] CloudWatch Agent instalado
- [ ] Métricas customizadas configuradas (6 métricas)
- [ ] Alarmes criados (5 alarmes)
- [ ] SNS topic criado
- [ ] Dashboard CloudWatch criado
- [ ] **CRÍTICO:** Confirmar inscrição SNS no email ✉️
- [ ] Verificar alarmes: AWS Console → CloudWatch → Alarms
- [ ] Verificar dashboard: AWS Console → CloudWatch → Dashboards

**Email de alertas:** `___________________________`

**Status:** ⬜ Pendente | ⏳ Em Progresso | ✅ Concluído | ❌ Erro

---

## 🔍 Fase 3: Verificação (10 minutos)

### Aplicação Funcionando

- [ ] Frontend carrega no browser
- [ ] Login funciona (se seed data habilitado)
- [ ] API responde: `curl http://<IP>/api/v1/health`
- [ ] SignalR conecta (se aplicável)
- [ ] Não há erros 500 no console do browser

### Containers Saudáveis

- [ ] SSH: `ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>`
- [ ] Status: `docker compose ps` → todos "Up" e "healthy"
- [ ] Logs: `docker compose logs --tail=100` → sem erros críticos
- [ ] Recursos: `docker stats --no-stream`
  - [ ] PostgreSQL < 200 MB RAM
  - [ ] Backend < 300 MB RAM
  - [ ] Frontend < 200 MB RAM

### Sistema Operacional

- [ ] Memória: `free -h` → available > 200 MB
- [ ] Disco: `df -h` → / com < 80% usado
- [ ] Swap: `swapon --show` → 2 GB swap ativo
- [ ] Nginx: `sudo systemctl status nginx` → active (running)

### Backups

- [ ] Listar: `aws s3 ls s3://<BUCKET>/daily/`
- [ ] Pelo menos 1 backup existe
- [ ] Tamanho razoável (> 100 KB)

### Monitoramento

- [ ] Métricas: `aws cloudwatch list-metrics --namespace SmartFinance`
- [ ] 6 métricas listadas
- [ ] Email SNS confirmado ✉️
- [ ] Dashboard acessível no console AWS

---

## 🎨 Fase 4: Otimização (OPCIONAL, 20 minutos)

### Performance

- [ ] Executar: `./optimize-performance.sh`
- [ ] Docker memory limits ajustados
- [ ] PostgreSQL otimizado para 1 GB RAM
- [ ] Nginx cache configurado
- [ ] Kernel tuning aplicado
- [ ] Log rotation configurado
- [ ] Testar performance: tempo de resposta < 500ms

### Custos

- [ ] Executar: `./estimate-costs.sh`
- [ ] Revisar custos estimados
- [ ] Confirmar dentro do Free Tier
- [ ] Configurar Budget Alert (opcional)
  - [ ] Limite: $5/mês
  - [ ] Threshold: 80%
  - [ ] Email de alerta

**Status:** ⬜ Pendente | ⬜ Não Aplicável | ✅ Concluído

---

## 📊 Fase 5: Monitoramento Contínuo

### Diário (2 minutos)

- [ ] Verificar aplicação no browser
- [ ] Verificar emails de alarme (se houver)
- [ ] Verificar uso de recursos (CloudWatch Dashboard)

### Semanal (10 minutos)

- [ ] SSH na instância
- [ ] Verificar recursos: `free -h`, `df -h`
- [ ] Verificar containers: `docker compose ps`
- [ ] Verificar logs: `docker compose logs --tail=100`
- [ ] Verificar backups: `aws s3 ls s3://<BUCKET>/daily/`

### Mensal (30 minutos)

- [ ] Executar: `./estimate-costs.sh`
- [ ] Revisar custos reais: AWS Cost Explorer
- [ ] Limpar Docker: `docker system prune -a` (cuidado!)
- [ ] Atualizar packages: `sudo apt update && sudo apt upgrade`
- [ ] Testar restore de backup (procedimento de DR)
- [ ] Revisar logs de segurança: `sudo journalctl -u fail2ban`

---

## 🆘 Troubleshooting

### Se algo der errado:

1. **Containers não iniciam:**
   - [ ] Verificar RAM: `free -h`
   - [ ] Adicionar swap se necessário
   - [ ] Ver logs: `docker compose logs`

2. **502 Bad Gateway:**
   - [ ] Verificar containers: `docker compose ps`
   - [ ] Restart: `docker compose restart`
   - [ ] Ver logs Nginx: `sudo tail -f /var/log/nginx/error.log`

3. **Out of Memory:**
   - [ ] Verificar swap: `swapon --show`
   - [ ] Adicionar swap: Script em TROUBLESHOOTING.md
   - [ ] Restart containers: `docker compose restart`

4. **Disco cheio:**
   - [ ] Limpar Docker: `docker system prune -a`
   - [ ] Limpar logs: `sudo journalctl --vacuum-time=7d`
   - [ ] Verificar backups antigos no S3

**Para mais ajuda:** Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📝 Informações de Referência Rápida

### Acessos

| Item | Valor |
|------|-------|
| **Elastic IP** | `___________________________` |
| **Instance ID** | `___________________________` |
| **S3 Bucket** | `___________________________` |
| **Domínio (se SSL)** | `___________________________` |
| **Email Alertas** | `___________________________` |
| **Região AWS** | `us-east-1` |

### URLs

| Serviço | URL |
|---------|-----|
| **Aplicação** | `http://<ELASTIC_IP>` ou `https://<DOMINIO>` |
| **API Health** | `http://<ELASTIC_IP>/api/v1/health` |
| **Nginx Health** | `http://<ELASTIC_IP>/health` |
| **CloudWatch Dashboard** | https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=smartfinance |
| **AWS Cost Explorer** | https://console.aws.amazon.com/cost-management/home |

### Comandos SSH Úteis

```bash
# Conectar
ssh -i smartfinance-key.pem ubuntu@<ELASTIC_IP>

# Navegar para aplicação
cd /opt/smartfinance

# Ver status
docker compose ps

# Ver logs
docker compose logs -f

# Restart
docker compose restart

# Verificar recursos
free -h
df -h
docker stats --no-stream

# Fazer backup manual
/opt/smartfinance/backup-postgres.sh
```

---

## 🎯 Meta de Conclusão

**Tempo estimado total:** ~2 horas

- ⬜ Fase 1: Pré-requisitos (15 min)
- ⬜ Fase 2: Setup Infraestrutura (70 min)
- ⬜ Fase 3: Verificação (10 min)
- ⬜ Fase 4: Otimização - Opcional (20 min)
- ⬜ Fase 5: Monitoramento Contínuo (ongoing)

**Data de início:** `___/___/______`
**Data de conclusão:** `___/___/______`

---

## ✨ Parabéns!

Quando todos os checkboxes estiverem marcados, você terá:

✅ Aplicação SmartFinance rodando na AWS
✅ Custo $0/mês no Free Tier (primeiro ano)
✅ Backups automáticos configurados
✅ Monitoramento e alertas ativos
✅ SSL/HTTPS configurado (se aplicável)
✅ Infraestrutura pronta para produção

**Custo total:** $0/mês (Ano 1) → ~$10/mês (Ano 2+)
**Economia vs ECS:** 92% de redução de custos

---

## 📞 Precisa de Ajuda?

- **Documentação:** Ver [INDEX.md](INDEX.md) para índice completo
- **Quick Start:** Ver [QUICKSTART.md](QUICKSTART.md)
- **Troubleshooting:** Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **GitHub Issues:** https://github.com/seu-usuario/smartfinance/issues
- **AWS Support:** https://console.aws.amazon.com/support

---

**Checklist criado:** 2026-02-03
**Versão:** 1.0.0

**Boa sorte com seu deploy! 🚀**
