using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using SmartFinance.Application.Common.Interfaces;
using SmartFinance.Domain.Interfaces;
using SmartFinance.Infrastructure.Data;
using SmartFinance.Infrastructure.Repositories;
using SmartFinance.Infrastructure.Services;
using SmartFinance.WebApi.Hubs;
using SmartFinance.WebApi.Middleware;
using System.Threading.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// Configure URLs to avoid port conflicts when running locally
if (builder.Environment.IsDevelopment() && Environment.GetEnvironmentVariable("ASPNETCORE_URLS") == null)
{
    builder.WebHost.UseUrls("http://localhost:5000");
}

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/smartfinance-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

builder.Services.AddDbContext<SmartFinanceDbContext>(options =>
{
    var logger = LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger("DatabaseSetup");
    logger.LogInformation("Environment: {Environment}", builder.Environment.EnvironmentName);
    logger.LogInformation("IsDevelopment: {IsDevelopment}", builder.Environment.IsDevelopment());
    
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
    {
        var useSsl = string.Equals(Environment.GetEnvironmentVariable("DB_SSL"), "true", StringComparison.OrdinalIgnoreCase);
        var connectionString = BuildPostgresConnectionString(databaseUrl, useSsl);
        logger.LogInformation("Using PostgreSQL (DATABASE_URL set).");
        options.UseNpgsql(connectionString);
    }
    else
    {
        // Use SQLite for local development
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        logger.LogInformation("Using SQLite with connection string: {ConnectionString}", connectionString);
        options.UseSqlite(connectionString);
    }
});

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(SmartFinance.Application.AssemblyReference.Assembly));

builder.Services.AddAutoMapper(typeof(Program).Assembly);

var jwtSecret = builder.Configuration["Jwt:SecretKey"] ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Trim().Length < 32)
{
    throw new InvalidOperationException("JWT Secret Key is not configured or is too short.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/financehub"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("ApiRateLimit", limiterOptions =>
    {
        limiterOptions.PermitLimit = 100;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 10;
    });

    options.AddFixedWindowLimiter("AuthRateLimit", limiterOptions =>
    {
        limiterOptions.PermitLimit = 5;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 2;
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();

// Add health checks
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy());
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "SmartFinance API", 
        Version = "v1",
        Description = "Enterprise Financial Management System",
        Contact = new OpenApiContact
        {
            Name = "SmartFinance Team",
            Email = "support@smartfinance.com"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")
        ?? "http://smartfinance-prod-alb-1713518371.sa-east-1.elb.amazonaws.com/")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "SmartFinance API V1");
        c.RoutePrefix = "";
    });
}

app.UseSerilogRequestLogging();

app.UseMiddleware<ExceptionMiddleware>();

app.UseHttpsRedirection();

app.UseCors("AllowedOrigins");

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<FinanceHub>("/financehub");
app.MapHealthChecks("/health");

using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<SmartFinanceDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        
        var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        if (!string.IsNullOrWhiteSpace(databaseUrl))
        {
            logger.LogInformation("Applying database migrations...");
            context.Database.Migrate();
        }
        else
        {
            logger.LogInformation("Attempting to ensure database is created...");
            context.Database.EnsureCreated();
        }

        logger.LogInformation("Database initialization completed successfully");
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while initializing the database");
        // Don't throw here - let the application start even if database fails
    }
}

app.Run();

static string BuildPostgresConnectionString(string databaseUrl, bool useSsl)
{
    var uri = new Uri(databaseUrl);
    var userInfoParts = uri.UserInfo.Split(':', 2, StringSplitOptions.RemoveEmptyEntries);
    var username = userInfoParts.Length > 0 ? Uri.UnescapeDataString(userInfoParts[0]) : string.Empty;
    var password = userInfoParts.Length > 1 ? Uri.UnescapeDataString(userInfoParts[1]) : string.Empty;

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = username,
        Password = password,
        SslMode = useSsl ? SslMode.Require : SslMode.Disable,
        TrustServerCertificate = useSsl
    };

    return builder.ConnectionString;
}
