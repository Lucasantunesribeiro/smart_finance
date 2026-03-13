import client from 'prom-client';

export const registry = new client.Registry();

client.collectDefaultMetrics({
  prefix: 'smartfinance_payment_',
  register: registry,
});

export const httpRequestsTotal = new client.Counter({
  name: 'smartfinance_payment_http_requests_total',
  help: 'Total de requisicoes HTTP processadas pelo microservico de pagamentos.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'smartfinance_payment_http_request_duration_seconds',
  help: 'Duracao das requisicoes HTTP do microservico de pagamentos.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export const queueJobsTotal = new client.Counter({
  name: 'smartfinance_payment_queue_jobs_total',
  help: 'Total de jobs de fila processados pelo microservico.',
  labelNames: ['queue', 'job_name', 'status'],
  registers: [registry],
});

export const queueJobDurationSeconds = new client.Histogram({
  name: 'smartfinance_payment_queue_job_duration_seconds',
  help: 'Duracao dos jobs de fila do microservico.',
  labelNames: ['queue', 'job_name', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const dependencyUp = new client.Gauge({
  name: 'smartfinance_payment_dependency_up',
  help: 'Estado das dependencias criticas do microservico.',
  labelNames: ['dependency'],
  registers: [registry],
});

export const setDependencyStatus = (dependency: string, isUp: boolean): void => {
  dependencyUp.labels(dependency).set(isUp ? 1 : 0);
};
