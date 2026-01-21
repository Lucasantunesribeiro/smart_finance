# Threat Model - SmartFinance

Resumo
- Escopo: frontend Next.js, API Node, RDS Postgres, ECS Fargate, ALB/WAF, CloudFront (opcional), Secrets Manager.
- Ativos: dados financeiros, credenciais, tokens de sessao, logs, chaves e segredos.
- Objetivo: reduzir risco de fraude, vazamento de dados e indisponibilidade.

Atores e motivacao
- Usuario legitimo: acesso a dados proprios e operacoes financeiras.
- Atacante externo: fraude, roubo de credenciais, abuso de API, DDoS.
- Atacante interno: abuso de privilegios, extracao de dados.
- Bot automatizado: brute force, scraping, credential stuffing.

Superficies de ataque
- Auth: login, refresh, cookies, CSRF, senha fraca, reuse.
- API: IDOR, validacao fraca, injeccao, SSRF, CORS aberto.
- Frontend: XSS, CSP insuficiente, tokens em localStorage.
- Infra: SGs abertos, TLS fraco, segredos em repo, logs sem auditoria.

Limites de confianca
- Navegador -> ALB/WAF (publico).
- ALB -> ECS tasks (privado).
- ECS -> RDS/Secrets Manager (privado).
- CI/CD -> AWS (OIDC, sem chaves estaticas).

Ameacas principais e mitigacoes
- Credential stuffing/brute force: rate limit por IP/conta, bloqueio temporario, logs de tentativa.
- IDOR: verificacao de ownership por recurso e deny-by-default.
- XSS: CSP forte, escaping, sem tokens em localStorage.
- CSRF: cookies HttpOnly + SameSite + token CSRF header.
- Injeccao: queries parametrizadas e validacao de schema.
- SSRF: allowlist de hosts, bloqueio de metadata, timeouts curtos.
- Vazamento de segredos: Secrets Manager, sem .env em git, rotacao.
- DDoS/API abuse: WAF rate-based + ALB + autoscaling.

Riscos residuais
- Dependencias vulneraveis: mitigado com audit e CodeQL.
- Erros de configuracao: mitigado com Terraform + revisao.
- Falha regional: mitigado com backups e RTO/RPO definidos.
