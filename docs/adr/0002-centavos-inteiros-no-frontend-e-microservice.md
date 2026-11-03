# 0002 — Centavos inteiros no frontend e no microservice Node

- Status: aceito
- Data: 2026-11

## Contexto

Frontend (Next.js/TypeScript) e microservice (`server.js`/`store.js`) trabalham com `number`,
ponto flutuante binário. Somas de totais (`reduce((s, x) => s + x)`), médias e diferenças
acumulavam erro (0.1 + 0.2 = 0.30000000000000004). O `pg` devolve `NUMERIC` como string e
o microservice somava com `Number(...)`. Entradas de formulário usavam `parseFloat`, que não
entende vírgula decimal (`"10,50"` → 10).

Bibliotecas como `decimal.js`/`big.js` resolveriam, mas são dependência nova para um uso
pequeno (somar, subtrair, dividir por inteiro, arredondar em 2 casas).

## Decisão

- Helpers sem dependência: `frontend/src/lib/money.ts` e `microservice/money.js`.
- Cada valor é convertido para centavos inteiros a partir da sua forma decimal em texto
  (`String(n)` ou a string do `pg`), sem multiplicar em float (1.005 × 100 = 100.4999…).
- Operações são feitas sobre inteiros e o resultado volta para reais só no fim.
- Arredondamento metade para longe do zero, igual ao backend.
- Exibição sempre por `formatCurrency` (`Intl.NumberFormat('pt-BR', { currency: 'BRL' })`).
- No microservice, o Joi arredonda `amount`/`allocated` para centavos e rejeita zero e
  valores acima de `NUMERIC(12,2)`.

## Consequências

- Totais exibidos e enviados batem com o backend.
- Exato até `Number.MAX_SAFE_INTEGER` centavos (~90 trilhões de reais), acima do limite
  das colunas.
- Os tipos continuam `number` na API JSON; o backend recebe o literal em `decimal` e
  arredonda de novo, então um cliente que envie 0.30000000000000004 grava 0.30.
- O contexto TypeScript de pagamentos (`microservice/src`, MongoDB) não foi migrado.
