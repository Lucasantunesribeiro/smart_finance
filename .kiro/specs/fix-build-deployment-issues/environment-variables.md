# Environment Variables for Redis Connection

## Overview

This document explains why no changes are needed to the environment variables for Redis connections in the backend and payment services, despite the Redis port mapping change in the `docker-compose.yml` file.

## Docker Networking Explanation

In Docker Compose, services are connected through a shared network (in this case, `smartfinance-network`). Within this network, services can communicate with each other using the service name as the hostname and the container's internal port.

### Redis Service Configuration

```yaml
redis:
  image: redis:7.2-alpine
  container_name: smartfinance-redis
  command: redis-server --requirepass SmartFinance123!
  ports:
     - "6380:6379"  # Change external port to 6380
  networks:
    - smartfinance-network
```

The port mapping `"6380:6379"` means:
- Redis is listening on port 6379 inside the container
- This port is mapped to port 6380 on the host machine
- Within the Docker network, Redis is still accessible at `redis:6379`

### Backend Service Configuration

```yaml
backend:
  environment:
    - ConnectionStrings__RedisConnection=redis:6379,password=SmartFinance123!
  networks:
    - smartfinance-network
```

The connection string `redis:6379` is correct because:
- `redis` is the service name within the Docker network
- `6379` is the internal port that Redis is listening on inside its container

### Payment Service Configuration

```yaml
payment-service:
  environment:
    - REDIS_URL=redis://redis:6379
    - REDIS_PASSWORD=SmartFinance123!
  networks:
    - smartfinance-network
```

The connection string `redis://redis:6379` is correct for the same reasons.

## Conclusion

No changes are needed to the environment variables for Redis connections in the backend and payment services because:

1. The port mapping `"6380:6379"` only affects connections from outside the Docker network
2. Within the Docker network, services communicate using the service name and internal port
3. The existing connection strings are correctly configured for internal Docker network communication

## External Access

If you need to connect to Redis from outside the Docker network (e.g., from a development tool on the host machine), you should use:

```
redis://localhost:6380
```

This is because the Redis container's port 6379 is mapped to port 6380 on the host machine.