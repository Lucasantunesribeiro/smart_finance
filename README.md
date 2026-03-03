# SmartFinance

> Plataforma full-stack de gestão financeira com foco em performance e otimização de custos

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](http://3.223.37.57)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![AWS](https://img.shields.io/badge/AWS-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

## 🎯 Destaques

- **💰 Economia de 100%** - Redução de $1,800/ano em custos AWS (migração ECS Fargate → EC2 Free Tier)
- **⚡ Alta Performance** - 87MB de uso em 1GB RAM, response time < 200ms
- **🔒 Segurança Completa** - JWT, bcrypt, CSRF, rate limiting, CSP headers
- **🌐 Multi-idioma** - Interface pt-BR/en-US com toggle dinâmico
- **📊 Real-time** - Dashboard com atualizações em tempo real via SignalR

## 🚀 Demo

**URL:** http://3.223.37.57

**Credenciais de teste:**
- Email: `admin@smartfinance.com`
- Senha: `admin123`

## 🛠️ Stack

### Frontend
- Next.js 14, TypeScript, TailwindCSS
- React Query, Shadcn/ui, i18n

### Backend
- Node.js, Express, PostgreSQL 15
- JWT authentication, bcrypt, rate limiting

### Infraestrutura
- AWS (EC2, RDS, CloudFront, ALB, WAF)
- Docker, Docker Compose, Nginx
- Terraform (IaC), GitHub Actions (CI/CD)

### .NET Backend (Enterprise)
- C# .NET 8, Clean Architecture
- Entity Framework Core, FluentValidation
- CQRS pattern, MediatR

## 💻 Como Rodar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+ (opcional para dev local)

### Iniciar com Docker
```bash
# 1. Clonar repositório
git clone https://github.com/Lucasantunesribeiro/smartfinance.git
cd smartfinance

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 3. Subir aplicação
docker compose up -d

# 4. Acessar
# Frontend: http://localhost:3000
# API: http://localhost:5000/api/v1
```

### Desenvolvimento Local (Frontend)
```bash
cd frontend
npm install
npm run dev
```

### Desenvolvimento Local (Microservice)
```bash
cd microservice
npm install
npm run dev
```

## 📁 Estrutura

```
smartfinance/
├── frontend/              # Next.js 14 + TypeScript
├── microservice/          # Node.js API + PostgreSQL
├── backend/               # .NET 8 (Clean Architecture)
├── infrastructure/
│   └── terraform-enterprise/  # AWS IaC
├── nginx/                 # Reverse proxy configs
└── docker-compose.yml     # Orquestração de containers
```

## 🔒 Segurança

- JWT access (15min) + refresh tokens (7 dias)
- Bcrypt password hashing (10 rounds)
- CSRF protection, rate limiting
- Input validation, SQL injection protection
- CSP headers, CORS configurado

## 📈 Arquitetura

### Produção Atual (EC2 Free Tier)
```
Internet → Nginx :80 → Frontend :3000
                    → Backend :5000 → PostgreSQL :5432
```

### Enterprise (Terraform IaC)
```
CloudFront → ALB → ECS Fargate → RDS PostgreSQL
                              → ElastiCache Redis
           WAF (proteção)
```

## 🌟 Conquistas Técnicas

- ✅ Migração zero-downtime de ECS para EC2
- ✅ Otimização de memória: 87MB em 1GB disponível
- ✅ Infraestrutura como código com Terraform
- ✅ CI/CD automatizado com GitHub Actions
- ✅ Arquitetura de microserviços
- ✅ Clean Architecture no backend .NET

## 📝 Variáveis de Ambiente

```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
JWT_SECRET_KEY=your-secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5000/financehub
```

Ver `.env.example` para configuração completa.

## 🚀 Deploy

### AWS EC2 (Produção Atual)
```bash
# 1. Upload código
scp -r . ubuntu@ip:/opt/smartfinance

# 2. Build e iniciar
docker compose up -d --build

# 3. Configurar Nginx
sudo systemctl restart nginx
```

### Terraform (Enterprise)
```bash
cd infrastructure/terraform-enterprise
terraform init
terraform plan
terraform apply
```

## 📊 Performance

| Métrica | Valor |
|---------|-------|
| Memory Usage | 87MB / 1GB |
| Response Time | < 200ms |
| Uptime | 100% |
| Cost/Month | $0 (Free Tier) |

## 🔗 Links

- [Demo Live](http://3.223.37.57)
- [Documentação API](http://3.223.37.57/api/v1/docs)

## 📄 Licença

MIT © 2026

---

**Desenvolvido com foco em performance, segurança e otimização de custos**
