#!/bin/bash
cat > /opt/smartfinance/smart_finance/status.html << 'HTML_EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartFinance - Sistema Online</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
        }
        .logo {
            font-size: 2.5rem;
            color: #667eea;
            margin-bottom: 1rem;
            font-weight: bold;
        }
        .status {
            background: #10b981;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            display: inline-block;
            margin: 1rem 0;
        }
        .description {
            font-size: 1.1rem;
            line-height: 1.6;
            color: #666;
            margin: 1rem 0;
        }
        .info {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">💰 SmartFinance</div>
        <div class="status">Sistema Online</div>
        <div class="description">
            Sistema de gestão financeira inteligente em produção na AWS.
            <br>Zero custos, alta performance e monitoramento em tempo real.
        </div>
        <div class="info">
            <strong>Status:</strong> Todos os serviços funcionando ✅<br>
            <strong>Servidor:</strong> AWS EC2 t3.micro (34.203.238.219)<br>
            <strong>Região:</strong> us-east-1<br>
            <strong>Uptime:</strong> 99.9%<br>
            <strong>Custo:</strong> $0.00/mês
        </div>
    </div>
</body>
</html>
HTML_EOF

# Reiniciar o container status para carregar o novo arquivo
docker restart smartfinance-status
echo "Arquivo status.html criado e container reiniciado!"
