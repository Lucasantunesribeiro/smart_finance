# 0001 — Dinheiro em `decimal` com arredondamento explícito no backend

- Status: aceito
- Data: 2026-11

## Contexto

O domínio financeiro (contas, transações, orçamentos) já modelava valores como `decimal`
e as colunas como `decimal(18,2)` no EF Core (`numeric(18,2)` nas migrations do PostgreSQL).
Mesmo assim havia pontos frágeis:

- `BudgetService` e `CategoryService` convertiam `Amount` para `double` antes de somar
  (`SumAsync(t => (double?)t.Amount)`). O motivo era o provedor SQLite, que não agrega
  `decimal` no banco. O efeito colateral: no PostgreSQL a soma também virava `double precision`.
- O arredondamento era implícito: valores com mais de 2 casas eram truncados/arredondados
  pelo banco no `SaveChanges`, enquanto a entidade em memória mantinha o valor original.
- Cálculo de saldo duplicado em três handlers (`switch` de tipo em Create/Update/Delete).
  No Update, trocar Receita↔Despesa sem mudar valor ou conta não atualizava o saldo, e a
  reversão usava o tipo novo.
- Valores zero/negativos só eram barrados por `DataAnnotations` no create; o update aceitava.

## Decisão

- `SmartFinance.Domain.Common.Money` concentra as regras: escala 2,
  `MidpointRounding.AwayFromZero` (mesma regra do `numeric` do PostgreSQL), limite de
  `numeric(18,2)`, média e percentual com arredondamento explícito.
- Valores de transação e orçamento passam por `Money.NormalizePositiveAmount`: arredonda para
  centavos e rejeita zero, negativo e acima do limite (`ArgumentException` → HTTP 400).
- O saldo é alterado só por `Account.ApplyTransaction` / `RevertTransaction`.
- Somas usam `SumMoneyAsync`: soma `decimal` no banco quando o provedor suporta (PostgreSQL)
  e, no SQLite, lê os valores e soma em memória, também em `decimal`. Nunca `double`.

## Consequências

- Totais e saldos são exatos; testes cobrem 0.1+0.2, sequência de transações, arredondamento,
  rejeição de valores inválidos e ida/volta JSON de `decimal` (System.Text.Json não usa `double`).
- Nenhuma mudança de schema: tipos de coluna e snapshot das migrations já eram coerentes.
- No SQLite (dev local) as agregações de orçamento/categoria leem as linhas para a memória.
  Aceitável para desenvolvimento; produção usa PostgreSQL.
- Transferências (`TransactionType.Transfer`) continuam sem efeito no saldo: não há conta de
  destino modelada.
