# Redis Port Configuration Fix

## Overview

The Redis service in the `docker-compose.yml` file has been configured to use port 6380 on the host machine to avoid conflicts with any existing Redis instances. However, the backend and payment services are still configured to connect to Redis on the default port 6379.

## Current Configuration

### Redis Service
```yaml
# Redis Cache
redis:
  image: redis:7.2-alpine
  container_name: smartfinance-redis
  command: redis-server --requirepass SmartFinance123!
  ports:
     - "6380:6379"  # Change external port to 6380
  volumes:
    - redis_data:/data
  networks:
    - smartfinance-network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Backend Service
```yaml
# .NET Backend API
backend:
  environment:
    # ...
    - ConnectionStrings__RedisConnection=redis:6379,password=SmartFinance123!
    # ...
```

### Payment Service
```yaml
# Node.js Payment Microservice
payment-service:
  environment:
    # ...
    - REDIS_URL=redis://redis:6379
    - REDIS_PASSWORD=SmartFinance123!
    # ...
```

## Analysis

The port mapping `"6380:6379"` means that Redis is accessible on port 6380 on the host machine, but within the Docker network, it's still accessible on port 6379. Since the backend and payment services are connecting to Redis using the service name `redis` within the Docker network, they should still use port 6379.

## Conclusion

No changes are needed to the backend and payment service configurations because:

1. Within the Docker network, services can communicate using the service name and the container's internal port (6379).
2. The port mapping `"6380:6379"` only affects connections from outside the Docker network (e.g., from the host machine).
3. The connection strings `redis:6379` and `redis://redis:6379` are correct for internal Docker network communication.

## External Access

If you need to connect to Redis from outside the Docker network (e.g., from a development tool on the host machine), you should use port 6380:

```
redis://localhost:6380
```

## Verification

To verify that the services can connect to Redis:

1. Start the Docker Compose stack:
   ```bash
   docker-compose up -d
   ```

2. Check the logs for connection errors:
   ```bash
   docker-compose logs backend | grep -i redis
   docker-compose logs payment-service | grep -i redis
   ```

3. Verify Redis connectivity from within the containers:
   ```bash
   docker exec -it smartfinance-backend sh -c "apt-get update && apt-get install -y redis-tools && redis-cli -h redis -p 6379 -a SmartFinance123! ping"
   docker exec -it smartfinance-payment-service sh -c "redis-cli -h redis -p 6379 -a SmartFinance123! ping"
   ```

These commands should return `PONG` if the connection is successful.