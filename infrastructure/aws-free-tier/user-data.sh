#!/bin/bash
set -x
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Atualizar sistema
apt-get update
apt-get upgrade -y

# Instalar dependências básicas
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    vim \
    fail2ban \
    ufw

# Configurar swap (importante para t2.micro com 1 GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Verificar swap
swapon --show

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Adicionar usuário ubuntu ao grupo docker
usermod -aG docker ubuntu

# Instalar Docker Compose
DOCKER_COMPOSE_VERSION="2.24.5"
curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Configurar Docker daemon (otimizado para low memory)
cat > /etc/docker/daemon.json << 'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 64000,
      "Soft": 64000
    }
  }
}
DOCKEREOF

systemctl restart docker
systemctl enable docker

# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Configurar Fail2Ban (proteção SSH)
systemctl enable fail2ban
systemctl start fail2ban

# Configurar UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar diretório para aplicação
mkdir -p /opt/smartfinance
chown ubuntu:ubuntu /opt/smartfinance

# Marcar instalação completa
touch /var/log/user-data-complete

echo "User data script completed successfully"
