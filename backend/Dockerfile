# Multi-stage build optimized for t2.micro instance
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 5000

# Install curl for health checks
RUN apk add --no-cache curl

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src

# Copy csproj files and restore dependencies (layer caching optimization)
COPY ["src/SmartFinance.WebApi/SmartFinance.WebApi.csproj", "src/SmartFinance.WebApi/"]
COPY ["src/SmartFinance.Application/SmartFinance.Application.csproj", "src/SmartFinance.Application/"]
COPY ["src/SmartFinance.Domain/SmartFinance.Domain.csproj", "src/SmartFinance.Domain/"]
COPY ["src/SmartFinance.Infrastructure/SmartFinance.Infrastructure.csproj", "src/SmartFinance.Infrastructure/"]

RUN dotnet restore "src/SmartFinance.WebApi/SmartFinance.WebApi.csproj" \
    --runtime alpine-x64

# Copy source code and build
COPY . .
WORKDIR "/src/src/SmartFinance.WebApi"

# Build with optimizations for production
RUN dotnet build "SmartFinance.WebApi.csproj" \
    -c Release \
    -o /app/build \
    --runtime alpine-x64 \
    --self-contained false \
    --no-restore

# Publish stage
FROM build AS publish
RUN dotnet publish "SmartFinance.WebApi.csproj" \
    -c Release \
    -o /app/publish \
    --runtime alpine-x64 \
    --self-contained false \
    --no-restore \
    /p:PublishTrimmed=false

# Production stage - optimized for memory usage
FROM base AS production
WORKDIR /app

# Create application directories
RUN mkdir -p /app/data /app/logs && \
    addgroup -g 1001 -S smartfinance && \
    adduser -S smartfinance -u 1001 -G smartfinance

# Copy published application
COPY --from=publish --chown=smartfinance:smartfinance /app/publish .

# Set proper permissions
RUN chown -R smartfinance:smartfinance /app

USER smartfinance

# Environment variables for production
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:5000
ENV DOTNET_RUNNING_IN_CONTAINER=true
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Optimized health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dotnet", "SmartFinance.WebApi.dll"]