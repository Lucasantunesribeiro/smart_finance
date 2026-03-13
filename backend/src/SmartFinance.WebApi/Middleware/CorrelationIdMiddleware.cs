using System.Diagnostics;
using Microsoft.Extensions.Primitives;
using Serilog.Context;

namespace SmartFinance.WebApi.Middleware;

public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-Id";

    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = ResolveCorrelationId(context.Request.Headers[HeaderName]);

        context.TraceIdentifier = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        using (LogContext.PushProperty("TraceId", Activity.Current?.TraceId.ToString() ?? string.Empty))
        using (LogContext.PushProperty("RequestPath", context.Request.Path.Value ?? string.Empty))
        {
            await _next(context);
        }
    }

    private static string ResolveCorrelationId(StringValues headerValues)
    {
        var headerValue = headerValues.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(headerValue))
        {
            return headerValue;
        }

        return Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N");
    }
}
