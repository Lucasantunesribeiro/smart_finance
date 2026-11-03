# Workflows do GitHub Actions

| Workflow | Gatilhos | O que faz |
|---|---|---|
| `ci.yml` | `pull_request` e `push` em `main` | Build e testes do backend .NET, lint/type-check/testes/build do frontend, testes do microservice |
| `codeql.yml` | `pull_request`, `push` em `main`, semanal | Análise CodeQL (JavaScript e C#) |
| `security-scan.yml` | diário, manual, `push` em `main` com mudança em `package*.json`/`Dockerfile` | Trivy, `npm audit` e Gitleaks |
| `deploy.yml` | `push` em `main` e manual | Deploy via SSH na instância EC2 (não roda em pull request) |
| `deploy-github-pages.yml` | apenas manual | Build estático para GitHub Pages (desativado na prática) |

## Segredos usados

- `EC2_HOST`, `EC2_SSH_KEY`: acesso SSH do `deploy.yml`.
- `GITHUB_TOKEN`: fornecido pelo GitHub.

Os segredos da aplicação ficam no `.env` do servidor, fora do repositório (ver `.env.example`).
