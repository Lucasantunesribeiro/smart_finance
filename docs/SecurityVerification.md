# Security Verification - SmartFinance

Checklist OWASP/ASVS
- [~] HTTPS only (CloudFront HTTPS ativo; TLS ALB depende de dominio + ACM)
- [x] WAF ativo (Managed Rules + rate-based)
- [x] GuardDuty/Security Hub/Config ativos
- [x] Segredos fora do repo (Secrets Manager)
- [x] CSP + headers de seguranca
- [x] Cookies HttpOnly/Secure + CSRF token
- [x] Rate limit por IP e por conta
- [x] Logs estruturados com request-id
- [x] Sem stack trace em prod

Evidencias (exemplos de comandos)
- curl -I https://<cloudfront-domain> | findstr /i "strict-transport content-security"
- aws wafv2 list-web-acls --scope REGIONAL --region sa-east-1
- aws wafv2 list-web-acls --scope CLOUDFRONT --region us-east-1
- aws guardduty list-detectors --region sa-east-1
- aws securityhub get-findings --max-results 5 --region sa-east-1

Testes automatizados (alvo)
- AuthZ/IDOR: tentativas de acessar recursos de outro usuario
- CSRF: POST sem X-CSRF-Token deve falhar
- CORS: origin nao permitido deve falhar
- SSRF: allowlist de hosts externos
- Headers: CSP/HSTS/Frame-Options
- Injection: inputs maliciosos sem impacto

Criterios de aceite
- HTTPS ativo (CloudFront ou ALB com ACM)
- WAF ativo em ALB (e CloudFront se usado)
- GuardDuty/SecurityHub sem findings criticos
- Node LTS em runtime
- Sem segredos no git
