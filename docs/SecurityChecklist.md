# Security Checklist - OWASP 2025 + ASVS L2

Legenda
- [ ] pendente
- [x] implementado
- [~] parcial

OWASP 2025 -> Controles
- [~] A01 Broken Access Control -> ownership por recurso, deny-by-default (RBAC parcial)
- [~] A02 Cryptographic Failures -> TLS via CloudFront, segredos em Secrets Manager (TLS ALB pendente de dominio)
- [x] A03 Injection -> validacao schema, queries parametrizadas
- [~] A04 Insecure Design -> threat model, limites de confianca, rate limit
- [~] A05 Security Misconfiguration -> headers, CORS estrito, WAF, SG restritos
- [~] A06 Vulnerable Components -> npm audit, CodeQL, gitleaks
- [~] A07 Identification/Auth Failures -> cookies HttpOnly, rotacao refresh, revogacao server-side
- [~] A08 Software/Data Integrity -> CI com OIDC, scanning, imagens versionadas
- [~] A09 Logging/Monitoring -> logs estruturados, request-id, alarms CloudWatch
- [ ] A10 SSRF -> allowlist, bloqueio de metadata, timeouts

ASVS L2 (resumo)
- [x] V1 Architecture: threat model e revisao de riscos
- [~] V2 Auth: bcrypt, lock temporario, MFA admin pendente, reset seguro pendente
- [x] V3 Session: cookie HttpOnly/Secure, rotacao, revogacao server-side
- [~] V4 Access Control: check por recurso, evitar IDOR (RBAC parcial)
- [x] V5 Validation: schema em todas entradas, size limits
- [~] V6 Crypto: KMS/Secrets Manager, TLS forte pendente de dominio
- [x] V7 Error Handling: mensagens genericas em prod, sem stack trace
- [~] V8 Data Protection: criptografia at-rest, backups, least privilege
- [~] V9 Communications: CORS allowlist, HSTS/CSP
- [~] V10 Malicious Code: SAST, SCA, secret scanning
- [~] V11 Business Logic: rate limit, auditoria parcial
- [ ] V12 Files: upload restrito, antivirus se aplicavel
- [~] V13 API: versionamento, schema, rate limit
- [~] V14 Config: IaC, segregacao ambientes, log/auditoria
