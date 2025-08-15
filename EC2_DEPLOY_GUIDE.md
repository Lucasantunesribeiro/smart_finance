# 🚀 SmartFinance - Deploy AWS EC2 Free Tier

Guia completo para deploy **100% GRATUITO** no AWS EC2 Free Tier.

## 💰 Custo Total: R$ 0,00/mês

| Recurso | Limite Free Tier | Uso SmartFinance | Custo |
|---------|------------------|------------------|-------|
| EC2 t3.micro | 750 horas/mês | 24/7 | **R$ 0,00** |
| EBS Storage | 30GB | ~5GB | **R$ 0,00** |
| Data Transfer | 15GB/mês | ~2GB/mês | **R$ 0,00** |
| **TOTAL** | | | **R$ 0,00** |

## 🎯 Deploy em 2 Comandos

### 1️⃣ **Corrigir Docker (se necessário)**
```bash
curl -sSL https://raw.githubusercontent.com/lucasantunesribeiro/smart_finance/main/fix-ec2-docker.sh | bash
```

### 2️⃣ **Deploy Completo**
```bash
curl -sSL https://raw.githubusercontent.com/lucasantunesribeiro/smart_finance/main/deploy-free-tier.sh | bash
```

## 🔧 Resolução de Problemas

### ❌ **Erro: "docker: command not found"**
```bash
# Instalar Docker
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
newgrp docker
```

### ❌ **Erro: "Permission denied"**
```bash
# Corrigir permissões
sudo chown -R ec2-user:ec2-user /opt/smartfinance
newgrp docker
```

### ❌ **Erro: "Out of memory"**
```bash
# Configurar SWAP
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### ❌ **Containers não iniciam**
```bash
# Limpar Docker e reiniciar
docker system prune -f
docker-compose down
docker-compose up -d
```

## 📊 Monitoramento

### **Verificar Status**
```bash
# Status dos containers
docker-compose ps

# Uso de recursos
free -h
df -h

# Logs dos serviços
docker-compose logs -f
```

### **URLs de Teste**
```bash
# Obter IP público
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Testar serviços
curl http://$PUBLIC_IP:5000/health
curl http://$PUBLIC_IP:3001/health
```

## 🔄 Comandos Úteis

### **Reiniciar Aplicação**
```bash
cd /opt/smartfinance
docker-compose restart
```

### **Parar Aplicação**
```bash
cd /opt/smartfinance
docker-compose down
```

### **Ver Logs**
```bash
cd /opt/smartfinance
docker-compose logs -f [service_name]
```

### **Atualizar Aplicação**
```bash
cd /opt/smartfinance
git pull origin main
docker-compose up -d --build
```

## 🛡️ Segurança Free Tier

### **Firewall Básico**
```bash
# Permitir apenas portas necessárias
sudo ufw enable
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 3000  # Frontend
sudo ufw allow 5000  # Backend
sudo ufw allow 3001  # Payment
```

### **Backup Automático**
```bash
# Criar script de backup
cat > /opt/smartfinance/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf /tmp/smartfinance_backup_$DATE.tar.gz /opt/smartfinance
aws s3 cp /tmp/smartfinance_backup_$DATE.tar.gz s3://your-backup-bucket/
rm /tmp/smartfinance_backup_$DATE.tar.gz
EOF

# Agendar backup diário
echo "0 2 * * * /opt/smartfinance/backup.sh" | crontab -
```

## 📈 Otimizações Free Tier

### **Reduzir Uso de Memória**
```bash
# Configurar swap
sudo sysctl vm.swappiness=10
sudo sysctl vm.vfs_cache_pressure=50

# Limitar containers
docker update --memory=128m --memory-swap=256m container_name
```

### **Economizar Bandwidth**
```bash
# Habilitar compressão nginx
# Já configurado no deploy-free-tier.sh
```

### **Cache Inteligente**
```bash
# Redis para cache (já incluído)
# Nginx cache (já configurado)
```

## 🎯 Próximos Passos

### **1. Domínio Personalizado (Opcional)**
```bash
# Configurar Route 53 (Free Tier: 1 hosted zone)
# Apontar domínio para IP público do EC2
```

### **2. SSL/HTTPS (Gratuito)**
```bash
# Usar Let's Encrypt
sudo yum install -y certbot
sudo certbot --nginx -d seu-dominio.com
```

### **3. Monitoramento (Gratuito)**
```bash
# CloudWatch básico (Free Tier)
# Configurar alertas de CPU/Memória
```

## 🆘 Suporte

### **Logs de Debug**
```bash
# Sistema
sudo journalctl -u docker
sudo dmesg | tail

# Aplicação
docker-compose logs --tail=100

# Recursos
top
htop
iotop
```

### **Contato**
- 📧 **Email**: suporte@smartfinance.com
- 💬 **Issues**: [GitHub Issues](https://github.com/lucasantunesribeiro/smart_finance/issues)
- 📖 **Docs**: [Documentação](./README.md)

---

## ✅ Checklist de Deploy

- [ ] EC2 t3.micro criado (Free Tier)
- [ ] Security Group configurado (portas 22, 80, 3000, 5000, 3001)
- [ ] SSH funcionando
- [ ] Docker instalado
- [ ] Docker Compose instalado
- [ ] SWAP configurado (1GB)
- [ ] Aplicação deployada
- [ ] Todos os serviços rodando
- [ ] URLs testadas e funcionando
- [ ] Monitoramento configurado

**🎉 Parabéns! Seu SmartFinance está rodando 100% GRÁTIS no AWS!**