# 🚀 SmartFinance - Instruções de Deploy AWS Final

## ✅ Status das Correções Aplicadas

Todas as correções foram aplicadas com sucesso:

1. **✅ Select.Item Error Corrigido**
   - `AddTransactionDialog.tsx`: Inicialização com `undefined` em vez de strings vazias
   - `EditTransactionDialog.tsx`: Inicialização com `undefined` em vez de strings vazias

2. **✅ GitHub Actions Permissions Corrigidas**
   - `.github/workflows/deploy-github-pages.yml`: `contents: write` aplicado

3. **✅ Banking Routes Tests Corrigidos**
   - `tests/routes/bankingRoutes.test.ts`: Mock implementations corrigidas

4. **✅ Fraud Detection Service Corrigido**
   - `src/services/fraudDetectionService.ts`: Thresholds normalizados para escala 0-1

## 🎯 Deploy AWS - Comandos para Execução

### Passo 1: Conectar ao Servidor AWS
```bash
ssh -i smartfinance-keypair.pem ec2-user@34.203.238.219
```

### Passo 2: Navegar para o Projeto
```bash
cd /opt/smartfinance/smart_finance
```

### Passo 3: Parar Serviços Atuais
```bash
# Parar containers Docker se estiverem rodando
sudo docker-compose down 2>/dev/null || echo "Nenhum container rodando"

# Parar processos Node.js se estiverem rodando
sudo pkill -f "node.*server" 2>/dev/null || echo "Nenhum processo Node.js rodando"
```

### Passo 4: Atualizar Código com Correções
```bash
# Fazer pull das correções do repositório
git pull origin main

# Verificar se as correções foram aplicadas
git log --oneline -5
```

### Passo 5: Build e Deploy
```bash
# Opção A: Deploy com Docker Compose (Recomendado)
sudo docker-compose -f docker-compose.prod.yml up -d --build

# Opção B: Deploy Manual (se Docker não estiver disponível)
# Build frontend
cd frontend
npm ci
NEXT_PUBLIC_API_URL=http://34.203.238.219:5000/api/v1 \
NEXT_PUBLIC_PAYMENT_API_URL=http://34.203.238.219:3001/payment \
npm run build
cd ..

# Iniciar backend
cd microservice
nohup node server.js > /tmp/smartfinance-backend.log 2>&1 &
cd ..
```

### Passo 6: Verificar Deploy
```bash
# Verificar status dos containers
sudo docker ps

# Verificar logs
sudo docker-compose -f docker-compose.prod.yml logs --tail=50

# Testar endpoints
curl -v http://localhost:5000/api/v1/health
curl -v http://localhost:3000
curl -v http://34.203.238.219:5000/api/v1/health
```

## 🔍 URLs para Testar Após Deploy

- **Frontend**: http://34.203.238.219:3000
- **API Health**: http://34.203.238.219:5000/api/v1/health
- **Categories CRUD**: http://34.203.238.219:5000/api/v1/categories
- **Budgets CRUD**: http://34.203.238.219:5000/api/v1/budgets
- **Transactions**: http://34.203.238.219:5000/api/v1/transactions
- **Payment Health**: http://34.203.238.219:3001/payment/health

## 🚨 Verificações Críticas

### 1. Select.Item Error (Frontend)
Após deploy, testar:
- Abrir http://34.203.238.219:3000/dashboard
- Clicar em "Add Transaction"
- Verificar se não há erro de console relacionado a "value prop that is not an empty string"

### 2. GitHub Actions
Após deploy, verificar:
- Workflow em https://github.com/Lucasantunesribeiro/smart_finance/actions
- Deve executar sem erro de permissão

### 3. API Endpoints
Testar todos os endpoints CRUD:
```bash
# Categories
curl -X GET http://34.203.238.219:5000/api/v1/categories
curl -X POST http://34.203.238.219:5000/api/v1/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","type":1,"description":"Categoria teste"}'

# Budgets
curl -X GET http://34.203.238.219:5000/api/v1/budgets

# Transactions
curl -X GET http://34.203.238.219:5000/api/v1/transactions
```

## 📊 Monitoramento Pós-Deploy

### Logs a Verificar
```bash
# Logs gerais
sudo docker-compose -f docker-compose.prod.yml logs -f

# Logs específicos
sudo docker logs smartfinance-frontend
sudo docker logs smartfinance-backend
sudo docker logs smartfinance-payment
```

### Recursos do Servidor
```bash
# Uso de memória e CPU
docker stats

# Espaço em disco
df -h

# Processos ativos
ps aux | grep node
```

## 🎉 Deploy Completo

Após seguir estes passos, o SmartFinance deve estar funcionando 100% em produção com todas as correções aplicadas:

1. ✅ Erro Select.Item corrigido
2. ✅ GitHub Actions funcionando
3. ✅ Todos os testes passando
4. ✅ API CRUD completa funcionando
5. ✅ Frontend integrado corretamente
6. ✅ Sistema de pagamentos operacional

**🔗 Aplicação em produção**: http://34.203.238.219:3000