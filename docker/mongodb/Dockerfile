# Custom MongoDB container for SmartFinance Free Tier
FROM mongo:7.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=smartfinance2024
ENV MONGO_INITDB_DATABASE=smartfinance

# Copy initialization scripts
COPY init-scripts/ /docker-entrypoint-initdb.d/

# Copy custom MongoDB configuration
COPY mongod.conf /etc/mongod.conf

# Create data directory with proper permissions
RUN mkdir -p /data/db && chown -R mongodb:mongodb /data/db

# Expose MongoDB port
EXPOSE 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD mongosh --eval "db.adminCommand('ping')" || exit 1

# Use custom configuration
CMD ["mongod", "--config", "/etc/mongod.conf"]