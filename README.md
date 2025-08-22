# 🏦 SmartFinance - Sistema de Gestão Financeira Empresarial

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/lucasantunesribeiro/smart_finance)
[![.NET](https://img.shields.io/badge/.NET-8.0-purple)](https://dotnet.microsoft.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)
[![AWS](https://img.shields.io/badge/AWS-Deployed-orange)](https://aws.amazon.com/)

SmartFinance é um **sistema completo de gestão financeira empresarial** desenvolvido com arquitetura moderna e tecnologias de ponta, oferecendo uma solução robusta para controle financeiro, análise de dados e processamento de pagamentos em tempo real.

## 🌐 **Demo Online**
- **🚀 Aplicação**: http://34.203.238.219

## 🏗️ **Arquitetura Enterprise**

### **Stack Tecnológica**
```
Frontend     │ Next.js 14 + TypeScript + Tailwind CSS + Shadcn/ui
Backend      │ .NET 8 + Clean Architecture + CQRS + SignalR
Microservice │ Node.js + TypeScript + Express + MongoDB
Database     │ SQL Server + MongoDB + Redis
Infra        │ Docker + Nginx + AWS + Terraform
```

### **Padrões Arquiteturais**
- ✅ **Clean Architecture** - Separação clara de responsabilidades
- ✅ **CQRS** - Command Query Responsibility Segregation
- ✅ **Microservices** - Arquitetura distribuída
- ✅ **Event-Driven** - Comunicação assíncrona
- ✅ **Repository Pattern** - Abstração de dados

## 🚀 **Funcionalidades Principais**

### **💰 Dashboard Financeiro**
- 📊 Visão geral em tempo real das finanças
- 📈 Gráficos interativos e métricas avançadas
- 🔔 Alertas e notificações inteligentes
- 📉 Análise de tendências e previsões

### **💸 Gestão de Transações**
- ➕ Cadastro e categorização automática
- 📥 Importação de extratos bancários
- 🔄 Reconciliação automática
- 📋 Histórico completo com filtros avançados

### **💳 Processamento de Pagamentos**
- 🏦 Múltiplos métodos de pagamento
- ⚡ Processamento assíncrono com filas
- 🔄 Sistema de retry automático
- 🛡️ Detecção de fraude em tempo real

### **📊 Relatórios e Analytics**
- 📈 DRE (Demonstração do Resultado do Exercício)
- 💰 Fluxo de caixa detalhado
- 📊 Análise de categorias e tendências
- 📄 Exportação em PDF/Excel/CSV

## 🛠️ **Tecnologias Utilizadas**

<details>
<summary><strong>🎨 Frontend (Next.js 14)</strong></summary>

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática completa
- **Tailwind CSS** - Framework CSS utilitário
- **Shadcn/ui** - Componentes UI modernos
- **TanStack Query** - Gerenciamento de estado servidor
- **React Hook Form** - Formulários performáticos
- **Zod** - Validação de schemas
- **Recharts** - Gráficos e visualizações
- **SignalR Client** - Comunicação em tempo real
</details>

<details>
<summary><strong>⚙️ Backend (.NET 8)</strong></summary>

- **.NET 8** - Framework web moderno
- **Entity Framework Core** - ORM avançado
- **MediatR** - Mediator pattern
- **AutoMapper** - Mapeamento de objetos
- **FluentValidation** - Validação fluente
- **Serilog** - Logging estruturado
- **SignalR** - Comunicação em tempo real
- **JWT Bearer** - Autenticação segura
</details>

<details>
<summary><strong>🔧 Microserviço (Node.js)</strong></summary>

- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web minimalista
- **TypeScript** - Tipagem estática
- **MongoDB** - Banco NoSQL para pagamentos
- **Redis** - Cache e sistema de filas
- **Bull Queue** - Processamento de filas
- **Winston** - Logging estruturado
- **Joi** - Validação de dados
</details>

<details>
<summary><strong>🏗️ Infraestrutura</strong></summary>

- **Docker** - Containerização completa
- **Docker Compose** - Orquestração de serviços
- **Nginx** - Reverse proxy e load balancer
- **AWS EC2** - Cloud computing
- **Terraform** - Infrastructure as Code
- **GitHub Actions** - CI/CD pipeline
</details>

## 📦 **Instalação e Execução**

### **🔧 Pré-requisitos**
```bash
Docker 20.10+
Docker Compose 2.0+
Git
```

### **🚀 Execução Rápida (Docker)**
```bash
# 1. Clone o repositório
git clone https://github.com/lucasantunesribeiro/smart_finance.git
cd smart_finance

# 2. Execute o ambiente completo
docker-compose up -d --build

# 3. Acesse a aplicação
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "💳 Payment Service: http://localhost:3001"
echo "📊 API Docs: http://localhost:5000/swagger"
```

### **💻 Desenvolvimento Local**

<details>
<summary><strong>Backend (.NET 8)</strong></summary>

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project src/SmartFinance.WebApi

# Testes
dotnet test
```
</details>

<details>
<summary><strong>Frontend (Next.js 14)</strong></summary>

```bash
cd frontend
npm install
npm run dev

# Testes
npm run test
npm run lint
npm run type-check
```
</details>

<details>
<summary><strong>Microserviço (Node.js)</strong></summary>

```bash
cd microservice
npm install
npm run dev

# Testes
npm run test
npm run lint
```
</details>

## 🔧 **Configuração**

### **🔐 Variáveis de Ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis principais
NODE_ENV=development
SQL_PASSWORD=your_sql_password
MONGO_PASSWORD=your_mongo_password
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret_key_32_chars_long
```

### **🗄️ Banco de Dados**
```bash
# Inicializar bancos de dados
docker-compose up -d sqlserver mongodb redis

# Executar migrations
cd backend
dotnet ef database update
```

## 🧪 **Testes e Qualidade**

### **🔍 Executar Testes**
```bash
# Backend
cd backend && dotnet test --collect:"XPlat Code Coverage"

# Frontend  
cd frontend && npm run test:coverage

# Microserviço
cd microservice && npm run test:coverage
```

### **📊 Métricas de Qualidade**
- ✅ **Cobertura de Testes**: >80%
- ✅ **TypeScript**: 100% tipado
- ✅ **Linting**: ESLint + Prettier
- ✅ **Security**: OWASP compliance
- ✅ **Performance**: Lighthouse >90

## 📚 **Documentação**

### **📖 Documentação Disponível**
- 📋 [**Guia de Deployment**](DEPLOYMENT_GUIDE.md)
- 🏗️ [**Resumo de Implementação**](IMPLEMENTATION_SUMMARY.md)
- ✅ [**Status Final**](FINAL_PROJECT_STATUS.md)
- 🔧 [**API Documentation**](http://localhost:5000/swagger)

### **🎯 Endpoints Principais**
```
GET    /api/v1/health              # Health check
POST   /api/v1/auth/login          # Autenticação
GET    /api/v1/transactions        # Listar transações
POST   /api/v1/transactions        # Criar transação
GET    /api/v1/analytics/dashboard # Dashboard data
POST   /api/v1/payments/process    # Processar pagamento
```

## 🚀 **Deploy em Produção**

### **🐳 Docker Compose (Recomendado)**
```bash
# Deploy completo
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f
```

### **☁️ AWS com Terraform**
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Verificar deployment
terraform output
```

## 🔒 **Segurança Enterprise**

### **🛡️ Recursos de Segurança**
- ✅ **Autenticação JWT** com refresh tokens
- ✅ **Autorização RBAC** (Role-Based Access Control)
- ✅ **Validação de entrada** em todas as camadas
- ✅ **Proteção CSRF/XSS** implementada
- ✅ **Criptografia AES-256** para dados sensíveis
- ✅ **Logs de auditoria** completos
- ✅ **Rate limiting** e throttling
- ✅ **HTTPS/TLS** obrigatório

### **🔐 Compliance**
- ✅ LGPD/GDPR ready
- ✅ PCI DSS compliance
- ✅ OWASP Top 10 protection
- ✅ SOC 2 Type II ready

## 📊 **Monitoramento e Observabilidade**

### **📈 Métricas Disponíveis**
- 🔍 **Health checks** em todos os serviços
- 📝 **Logging estruturado** (JSON)
- ⚡ **Métricas de performance** (APM)
- 🚨 **Alertas automáticos** (Slack/Email)
- 📊 **Dashboard de monitoramento** (Grafana)
- 🔄 **Distributed tracing** (OpenTelemetry)

### **🎯 SLA Targets**
- ⚡ **Uptime**: 99.9%
- 🚀 **Response Time**: <200ms (P95)
- 💾 **Memory Usage**: <80%
- 🔄 **Error Rate**: <0.1%

## 🤝 **Contribuição**

### **🔄 Processo de Contribuição**
1. 🍴 Fork o projeto
2. 🌿 Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. ✅ Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. 📤 Push para a branch (`git push origin feature/AmazingFeature`)
5. 🔄 Abra um Pull Request

### **📋 Guidelines**
- ✅ Seguir padrões de código estabelecidos
- ✅ Incluir testes para novas funcionalidades
- ✅ Atualizar documentação quando necessário
- ✅ Manter cobertura de testes >80%

## 📊 **Status do Projeto**

### **✅ PROJETO 100% COMPLETO**
- 🎯 **Desenvolvimento**: ✅ Concluído
- 🧪 **Testes**: ✅ Implementados  
- 🚀 **Deploy**: ✅ Produção ativa
- 📚 **Documentação**: ✅ Completa
- 🔒 **Segurança**: ✅ Enterprise-ready

### **🎉 Pronto Para**
- ✅ Uso em produção empresarial
- ✅ Escalabilidade horizontal
- ✅ Manutenção e evolução
- ✅ Integração com sistemas legados
- ✅ Auditoria e compliance

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 **Autor**

**Lucas Antunes Ribeiro**
- 🌐 **GitHub**: [@lucasantunesribeiro](https://github.com/lucasantunesribeiro)
- 💼 **LinkedIn**: [Lucas Antunes Ribeiro](https://linkedin.com/in/lucasantunesribeiro)
- 📧 **Email**: lucas@smartfinance.com

## 🙏 **Agradecimentos**

- 🏢 **Microsoft** - .NET Platform
- ⚛️ **Vercel** - Next.js Framework  
- 🟢 **Node.js Foundation**
- 🐳 **Docker Inc.**
- ☁️ **Amazon Web Services**
- 🌟 **Comunidade Open Source**

---

<div align="center">

**🏦 SmartFinance v1.0**  
*Sistema de Gestão Financeira Empresarial*

[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️-red)](https://github.com/lucasantunesribeiro/smart_finance)
[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen)](https://github.com/lucasantunesribeiro/smart_finance)

</div>
