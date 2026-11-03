# 0003 — Outbox transacional para o evento `finance.transaction.created.v1`

- Status: aceito (documenta decisão já existente no código)
- Data: 2026-11

## Contexto

Ao criar uma transação o backend precisa notificar outros consumidores (hoje, o
`TransactionCreatedConsumerService`, que repassa o evento ao SignalR). Publicar direto no
RabbitMQ dentro do handler pode perder eventos (falha após o commit) ou publicar eventos de
transações que não foram gravadas (falha antes do commit).

## Decisão

- `CreateTransactionCommandHandler` grava a transação, o novo saldo e uma `OutboxMessage`
  no mesmo `SaveChangesAsync` (mesma transação de banco).
- `OutboxPublisherService` (BackgroundService) lê mensagens pendentes, publica no exchange
  configurado e aplica retry com backoff exponencial; após `PublisherMaxRetries` a mensagem
  fica como `DeadLettered`.
- O consumer registra `ProcessedIntegrationEvents` (índice único `MessageId + Consumer`)
  para ser idempotente, e a fila tem DLQ.
- O payload é JSON (`JsonSerializerDefaults.Web`); `amount` é `decimal` serializado como
  número JSON sem passar por `double`.
- Mensageria liga/desliga por `Messaging__RabbitMq__Enabled`.

## Consequências

- Entrega pelo menos uma vez; consumidores precisam ser idempotentes.
- Latência de publicação depende de `PublisherPollIntervalSeconds`.
- Só o evento de criação existe; edição e exclusão de transações não geram eventos.
