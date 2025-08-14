FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["src/SmartFinance.WebApi/SmartFinance.WebApi.csproj", "src/SmartFinance.WebApi/"]
COPY ["src/SmartFinance.Application/SmartFinance.Application.csproj", "src/SmartFinance.Application/"]
COPY ["src/SmartFinance.Domain/SmartFinance.Domain.csproj", "src/SmartFinance.Domain/"]
COPY ["src/SmartFinance.Infrastructure/SmartFinance.Infrastructure.csproj", "src/SmartFinance.Infrastructure/"]

RUN dotnet restore "src/SmartFinance.WebApi/SmartFinance.WebApi.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/src/SmartFinance.WebApi"
RUN dotnet build "SmartFinance.WebApi.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "SmartFinance.WebApi.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Create directories for logs
RUN mkdir -p /app/logs

COPY --from=publish /app/publish .

# Create non-root user
RUN groupadd -r smartfinance && useradd -r -g smartfinance smartfinance
RUN chown -R smartfinance:smartfinance /app
USER smartfinance

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["dotnet", "SmartFinance.WebApi.dll"]