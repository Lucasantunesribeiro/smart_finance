# Workflows do GitHub Actions

| Workflow | Gatilhos | O que faz |
|---|---|---|
| `ci.yml` | `pull_request` e `push` em `main` | Build e testes do backend .NET, lint/type-check/testes/build do frontend, testes do microservice |
| `codeql.yml` | `pull_request`, `push` em `main`, semanal | Análise CodeQL (JavaScript e C#) |
| `security-scan.yml` | diário, manual, `push` em `main` com mudança em `package*.json`/`Dockerfile` | Trivy, `npm audit` e Gitleaks |
| `deploy.yml` | apenas manual (`workflow_dispatch`) | Deploy via SSH na instância EC2. Não roda em push nem em pull request: a instância está desligada |

## Segredos usados

- `EC2_HOST`, `EC2_SSH_KEY`: acesso SSH do `deploy.yml`.
- `GITHUB_TOKEN`: fornecido pelo GitHub.

Os segredos da aplicação ficam no `.env` do servidor, fora do repositório (ver `.env.example`).

O deploy gratuito (Render + Neon + Vercel) não usa GitHub Actions: cada plataforma faz o build a partir do repositório. Ver a seção "Deploy gratuito" do README.
