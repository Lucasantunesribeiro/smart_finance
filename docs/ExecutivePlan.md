# Plano Executivo - SmartFinance

Resumo executivo
- Objetivo: elevar para padrao enterprise com seguranca, confiabilidade e deploy AWS em nova conta.
- Stack alvo: Next.js + Node.js em ECS Fargate, ALB + WAF, CloudFront opcional, RDS Postgres, Secrets Manager.
- Prioridade: OWASP 2025 + ASVS L2, IaC, observabilidade e pipeline com OIDC.

Decisoes de arquitetura
- IaC: Terraform (modularidade, amplo suporte AWS, facil padronizacao).
- Compute: ECS Fargate em subnets privadas (evita EC2 gerenciado manualmente).
- Edge: ALB publico com WAF; CloudFront habilitado para HTTPS sem dominio.
- Data: RDS Postgres com criptografia KMS, backups e subnets privadas.
- Secrets: Secrets Manager com rotacao futura.

Seguranca e confiabilidade
- Auth: cookies HttpOnly + CSRF, refresh token com rotacao e revogacao server-side.
- Protecoes OWASP: validacao schema, queries parametrizadas, CORS allowlist, headers CSP/HSTS.
- Conta AWS: CloudTrail, Config, GuardDuty, SecurityHub ativos por default.
- Observabilidade: CloudWatch logs, alarms de 5xx, CPU e conexoes RDS.

Custos
- NAT gateway unico (menor custo). Opcional aumentar para HA.
- CloudFront habilitado (custo moderado, melhora cache e TLS).
- RDS t4g.micro com storage 20GB (ajustavel).

Riscos e mitigacoes
- Sem dominio: TLS via CloudFront; TLS ALB exige ACM + DNS.
- Dependencias: CI com npm audit, CodeQL, gitleaks.
- Rollback: manter tags anteriores e forcar deploy.
