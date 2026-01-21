# Pendencias e Nice-to-have

Alta prioridade
- Habilitar TLS no ALB com dominio + ACM (remover HTTP direto).
- Implementar politicas MFA e reset de senha seguro.
- Implementar controles anti-SSRF com allowlist explicita e bloqueio de metadata.

Media prioridade
- Multi-AZ para RDS e NAT em duas AZs.
- RBAC mais detalhado por funcao e auditoria por acao sensivel.
- Pipeline com testes de integracao e DAST automatizado.

Baixa prioridade
- Cache de conteudo estatico via CloudFront com politicas custom.
- Dashboards adicionais (p95 latency, erro por rota).
- Rotacao automatica de segredos com Lambda.
